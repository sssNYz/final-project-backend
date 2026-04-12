import { prisma } from "../db/client";
import { sendFcmMulticast } from "../push/fcm";
import { Job } from "bullmq";

interface NotificationJobData {
    logIds?: number[];
    logId?: number; // Support old jobs still in queue
    isSnooze?: boolean;
    nextSnoozeAts?: Record<string, string>; // logId -> nextSnoozeAt ISO string
}

export async function processNotificationJob(job: Job<NotificationJobData>) {
    const { isSnooze, nextSnoozeAts } = job.data;

    let logIds: number[] = [];
    if (job.data.logIds && Array.isArray(job.data.logIds)) {
        logIds = job.data.logIds;
    } else if (job.data.logId) {
        logIds = [job.data.logId];
    }

    if (logIds.length === 0) {
        console.error(`[NotificationWorker] Job ${job.id} missing logId/logIds`);
        return;
    }

    console.log(`[NotificationWorker] Processing job ${job.id} for logs [${logIds.join(",")}] (Snooze: ${isSnooze})`);

    // 1. Fetch Data
    const logs = await prisma.medicationLog.findMany({
        where: { logId: { in: logIds } },
        include: {
            medicineList: {
                include: {
                    profile: {
                        include: { user: true }
                    },
                    medicine: true,
                }
            }
        }
    });

    if (logs.length === 0) {
        console.error(`[NotificationWorker] Logs not found`);
        return;
    }

    // Filter out logs that were already sent (unless it's a snooze, where we want to send anyway)
    const validLogs = isSnooze ? logs : logs.filter(l => !l.pushSentAt);

    if (validLogs.length === 0) {
        console.log(`[NotificationWorker] Logs already sent`);
        return;
    }

    const firstLog = validLogs[0];
    const profile = firstLog.medicineList?.profile;
    if (!profile) return;
    const userId = profile.userId;

    // 2. Fetch Tokens
    const deviceTokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: { deviceTokenId: true, token: true },
    });

    const tokens = deviceTokens.map(t => t.token);
    if (tokens.length === 0) {
        console.log(`[NotificationWorker] No devices for user ${userId}`);
        return;
    }

    // 3. Construct Payload
    const isGroup = validLogs.length > 1;

    let title = "ถึงเวลากินยาแล้ว";
    let body = "กรุณาแตะการแจ้งเตือนเพื่อดำเนินการ";

    if (isGroup) {
        body = "มียาหลายรายการ กรุณาแตะการแจ้งเตือนเพื่อดำเนินการ";
    } else {
        if (isSnooze) {
            const snoozedCount = firstLog.snoozedCount ?? 0;
            title = `ถึงเวลากินยาแล้ว (เลื่อนแล้ว ${snoozedCount}/3 ครั้ง)`;
        }
    }

    const payloadItems = validLogs.map(log => ({
        type: isSnooze ? "SNOOZE_REMINDER" : "MEDICATION_REMINDER",
        logId: String(log.logId),
        profileId: String(log.profileId),
        profileName: log.medicineList?.profile?.profileName || "",
        mediListId: String(log.mediListId),
        mediThName: log.medicineList?.medicine?.mediThName || "",
        mediNickname: log.medicineList?.mediNickname || "",
        scheduleTime: log.scheduleTime.toISOString(),
        profilePicture: log.medicineList?.profile?.profilePicture || "",
        timestamp: new Date().toISOString(),
        isSnoozeReminder: isSnooze ? "true" : "false",
        snoozedCount: String(log.snoozedCount ?? 0),
        nextSnoozeAt: nextSnoozeAts?.[log.logId] ?? "",
        mealRelation: log.mealRelation || "",
    }));

    const dataPayload = isGroup ? {
        type: isSnooze ? "SNOOZE_SUMMARY" : "MEDICATION_SUMMARY",
        count: String(validLogs.length),
        payload: JSON.stringify(payloadItems), // Pack array here
        timestamp: new Date().toISOString(),
    } : payloadItems[0]; // Exactly map the single item if length 1

    console.log(`[NotificationWorker] Sending payload to ${tokens.length} devices:`, JSON.stringify(dataPayload, null, 2));

    try {
        const response = await sendFcmMulticast({
            tokens,
            notification: {
                title,
                body,
                imageUrl: "https://medi-buddy.xyz/medi-buddy-logo.png",
            },
            data: dataPayload as any,
            // Retain High Priority Configuration
            android: {
                priority: "high" as const,
                notification: {
                    sound: "cat_noti.mp3",
                },
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "cat_noti.mp3",
                    },
                },
            },
        });

        // 4. Handle Cleanup
        if (response.failureCount > 0) {
            const revokedCodes = new Set([
                "messaging/registration-token-not-registered",
                "messaging/invalid-registration-token",
            ]);
            const revokeIds: number[] = [];
            response.responses.forEach((res, idx) => {
                if (!res.success && res.error?.code && revokedCodes.has(res.error.code)) {
                    revokeIds.push(deviceTokens[idx].deviceTokenId);
                }
            });
            if (revokeIds.length > 0) {
                await prisma.deviceToken.deleteMany({
                    where: { deviceTokenId: { in: revokeIds } }
                });
            }
        }

        // 5. Mark as Sent
        if (response.successCount > 0) {
            const sentLogIds = validLogs.map(l => l.logId);
            await prisma.medicationLog.updateMany({
                where: { logId: { in: sentLogIds } },
                data: { pushSentAt: new Date() }
            });
            console.log(`[NotificationWorker] Success for logs [${sentLogIds.join(",")}]`);
        }

    } catch (error) {
        console.error(`[NotificationWorker] FCM Error`, error);
        throw error;
    }
}
