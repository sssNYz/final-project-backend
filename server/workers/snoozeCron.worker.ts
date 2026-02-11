import "dotenv/config";
import { prisma } from "../db/client";
import * as repo from "../medicationLog/medicationLog.repository";
import { notificationQueue } from "../queue/client";

const DEFAULT_INTERVAL_MS = 60 * 1000; // 1 minute
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

    // Check Max Snooze limit
    if (snoozedCount >= MAX_SNOOZE_COUNT) {
        await repo.markLogAsAutoSkipped(log.logId);
        console.log(`[snooze-cron] Auto-skipped log ${log.logId} after ${MAX_SNOOZE_COUNT} snoozes`);
        return;
    }

    // Clear nextSnoozeAt so we don't pick it up again immediately.
    // We assume the worker will successfully send the notification.
    await repo.updateLogAfterSnoozeReminder(log.logId, {
        nextSnoozeAt: null,
        pushSentAt: new Date(),
    });

    // Enqueue the job for reliable sending
    await notificationQueue.add("send-notification", {
        logId: log.logId,
        isSnooze: true
    });
}

async function tick() {
    const dueSnoozes = await repo.findLogsForSnoozeReminder();

    if (dueSnoozes.length === 0) return;

    console.log(`[snooze-cron] Processing ${dueSnoozes.length} snoozes -> Queue`);

    const results = await Promise.allSettled(
        dueSnoozes.map((log) => processSnoozeLog(log))
    );

    const successCount = results.filter(r => r.status === "fulfilled").length;
    console.log(`[snooze-cron] Enqueued ${successCount} snoozes.`);
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
