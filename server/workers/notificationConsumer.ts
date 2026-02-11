import { prisma } from "../db/client";
import { sendFcmMulticast } from "../push/fcm";
import { Job } from "bullmq";

interface NotificationJobData {
    logId: number;
    isSnooze?: boolean;
}

export async function processNotificationJob(job: Job<NotificationJobData>) {
    const { logId, isSnooze } = job.data;
    console.log(`[NotificationWorker] Processing job ${job.id} for log ${logId} (Snooze: ${isSnooze})`);

    // 1. Fetch Data
    const log = await prisma.medicationLog.findUnique({
        where: { logId },
        include: {
            medicineList: {
                include: {
                    profile: {
                        include: {
                            user: true
                        }
                    },
                    medicine: true, // If needed for names
                }
            }
        }
    });

    if (!log) {
        console.error(`[NotificationWorker] Log ${logId} not found`);
        return; // Stop processing
    }

    // NOTE: For Snooze, we update pushSentAt BEFORE enqueuing to prevent loops.
    // So we shouldn't check `if (log.pushSentAt)` strictly if it's a snooze.
    // actually, for snooze, we want to send ANYWAY.
    // For regular, we check pushSentAt.

    if (!isSnooze && log.pushSentAt) {
        console.log(`[NotificationWorker] Log ${logId} already sent at ${log.pushSentAt}`);
        return;
    }

    const profile = log.medicineList?.profile;
    if (!profile) return;
    const userId = profile.userId;

    // 2. Fetch Tokens
    const deviceTokens = await prisma.deviceToken.findMany({
        where: { userId, revokedAt: null },
        select: { deviceTokenId: true, token: true },
    });

    const tokens = deviceTokens.map(t => t.token);
    if (tokens.length === 0) {
        console.log(`[NotificationWorker] No devices for user ${userId}`);
        return;
    }

    // 3. Construct Payload
    // Note: Previous logic aggregated multiple logs. 
    // With the queue, we process one by one initially.
    // However, the user might want aggregation back later.
    // For reliability, let's start with 1-to-1 immediate delivery.

    const medicineName = log.medicineList?.mediNickname
        || log.medicineList?.medicine?.mediEnName
        || "Configuration Error";

    let title = "Medication Reminder";
    let body = `It's time to take ${medicineName} for ${profile.profileName}.`;

    if (isSnooze) {
        const snoozedCount = log.snoozedCount ?? 0;
        title = `Reminder (${snoozedCount}/3)`; // Hardcoded max for display
        body = `Time to take ${medicineName}. You snoozed this earlier.`;
    }

    try {
        const response = await sendFcmMulticast({
            tokens,
            notification: {
                title,
                body,
            },
            data: {
                type: isSnooze ? "SNOOZE_REMINDER" : "MEDICATION_REMINDER",
                logId: String(log.logId),
                profileId: String(profile.profileId),
                mediListId: String(log.mediListId),
                scheduleTime: log.scheduleTime.toISOString(),
                profilePicture: profile.profilePicture || "",
                timestamp: new Date().toISOString(),
                isSnoozeReminder: isSnooze ? "true" : "false",
                snoozedCount: String(log.snoozedCount ?? 0),
            },
        });

        // 4. Handle Cleanup (Revoke invalid tokens)
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
                await prisma.deviceToken.updateMany({
                    where: { deviceTokenId: { in: revokeIds } },
                    data: { revokedAt: new Date() }
                });
            }
        }

        // 5. Mark as Sent
        if (response.successCount > 0) {
            await prisma.medicationLog.update({
                where: { logId },
                data: { pushSentAt: new Date() }
            });
            console.log(`[NotificationWorker] Success for log ${logId}`);
        }

    } catch (error) {
        console.error(`[NotificationWorker] FCM Error`, error);
        throw error; // Throw so BullMQ retries
    }
}
