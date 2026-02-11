import { createNotificationWorker } from "../queue/client";
import { processNotificationJob } from "./notificationConsumer";
import { prisma } from "../db/client";

// Start the worker
const worker = createNotificationWorker(processNotificationJob);

console.log("[NotificationQueue] Worker started and listening for jobs...");

worker.on("completed", (job) => {
    console.log(`[NotificationQueue] Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
    console.error(`[NotificationQueue] Job ${job?.id} has failed with ${err.message}`);
});

// Graceful Shutdown
async function shutdown(signal: string) {
    console.log(`[NotificationQueue] Shutting down (${signal})...`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
