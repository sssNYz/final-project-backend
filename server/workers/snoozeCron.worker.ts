import "dotenv/config";
import { prisma } from "../db/client";
import { sendFcmMulticast } from "../push/fcm";
import * as repo from "../medicationLog/medicationLog.repository";

const DEFAULT_INTERVAL_MS = 60 * 1000; // 1 minute
const SNOOZE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SNOOZE_COUNT = 3;

function parsePositiveInt(value: string | undefined, fallback: number) {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const INTERVAL_MS = parsePositiveInt(
    process.env.SNOOZE_CRON_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
);

async function processSnoozeLog(log: Awaited<ReturnType<typeof repo.findLogsForSnoozeReminder>>[0]) {
    const snoozedCount = log.snoozedCount ?? 0;
    const userId = log.profile.userId;
    const profileId = log.profileId;
    const logId = log.logId;

    // Get medicine name for notification
    const medicineName =
        log.medicineList?.mediNickname ||
        log.medicineList?.medicine?.mediEnName ||
        log.medicineList?.medicine?.mediThName ||
        "your medicine";

    // Load device tokens
    const deviceTokens = await prisma.deviceToken.findMany({
        where: { userId, revokedAt: null },
        select: { deviceTokenId: true, token: true },
    });

    const tokens = deviceTokens.map((row) => row.token).filter(Boolean);

    if (tokens.length === 0) {
        console.log(`[snooze-cron] No device tokens for user ${userId}, skipping log ${logId}`);
        // Clear nextSnoozeAt since we can't notify
        await repo.updateLogAfterSnoozeReminder(logId, {
            nextSnoozeAt: null,
            pushSentAt: new Date(),
        });
        return;
    }

    try {
        const response = await sendFcmMulticast({
            tokens,
            notification: {
                title: `Reminder (${snoozedCount}/${MAX_SNOOZE_COUNT})`,
                body: `Time to take ${medicineName}. You snoozed this earlier.`,
            },
            data: {
                type: "SNOOZE_REMINDER",
                logId: String(logId),
                profileId: String(profileId),
                mediListId: String(log.medicineList?.mediListId ?? ""),
                scheduleTime: log.scheduleTime.toISOString(),
                snoozedCount: String(snoozedCount),
                isSnoozeReminder: "true",
            },
        });

        // Handle revoked tokens
        const revokedCodes = new Set([
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
        ]);

        const revokeIds: number[] = [];
        response.responses.forEach((result, idx) => {
            if (result.success) return;
            const code = (result.error as { code?: string } | undefined)?.code;
            if (code && revokedCodes.has(code)) {
                revokeIds.push(deviceTokens[idx]!.deviceTokenId);
            }
        });

        if (revokeIds.length > 0) {
            await prisma.deviceToken.updateMany({
                where: { deviceTokenId: { in: revokeIds } },
                data: { revokedAt: new Date() },
            });
        }

        if (response.successCount > 0) {
            console.log(`[snooze-cron] Sent snooze reminder ${snoozedCount}/${MAX_SNOOZE_COUNT} for log ${logId}`);

            // Check if this was the last snooze reminder
            if (snoozedCount >= MAX_SNOOZE_COUNT) {
                // Auto-skip after max snoozes
                await repo.markLogAsAutoSkipped(logId);
                console.log(`[snooze-cron] Auto-skipped log ${logId} after ${MAX_SNOOZE_COUNT} snoozes`);
            } else {
                // Clear nextSnoozeAt - user needs to press snooze again to schedule next reminder
                await repo.updateLogAfterSnoozeReminder(logId, {
                    nextSnoozeAt: null,
                    pushSentAt: new Date(),
                });
            }
        }
    } catch (error) {
        console.error("[snooze-cron] FCM send failed", logId, error);
    }
}

async function tick() {
    const dueSnoozes = await repo.findLogsForSnoozeReminder();

    if (dueSnoozes.length === 0) return;

    console.log(`[snooze-cron] processing ${dueSnoozes.length} snooze reminders`);

    const results = await Promise.allSettled(
        dueSnoozes.map((log) => processSnoozeLog(log))
    );

    results.forEach((result, idx) => {
        if (result.status === "rejected") {
            console.error(
                "[snooze-cron] failed to process snooze",
                dueSnoozes[idx].logId,
                result.reason
            );
        }
    });
}

let running = false;
async function safeTick() {
    if (running) return;
    running = true;
    try {
        await tick();
    } finally {
        running = false;
    }
}

console.log(`[snooze-cron] started intervalMs=${INTERVAL_MS}`);

await safeTick();
const interval = setInterval(safeTick, INTERVAL_MS);
// Don't call interval.unref() - we want this process to stay alive

async function shutdown(signal: string) {
    console.log(`[snooze-cron] shutting down (${signal})`);
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

