import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

// Shared Redis connection options
const connection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null, // Required by BullMQ
});

// Queue Name
export const NOTIFICATION_QUEUE_NAME = "medication-notification";

// The Queue Instance (Producer)
export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3, // Retry 3 times
        backoff: {
            type: "exponential",
            delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: true, // Keep clean
        removeOnFail: 100, // Keep last 100 failed jobs for debugging
    },
});

// Helper to create a worker (Consumer)
export function createNotificationWorker(processor: any) {
    return new Worker(NOTIFICATION_QUEUE_NAME, processor, { connection });
}

// Helper for events
export const notificationQueueEvents = new QueueEvents(NOTIFICATION_QUEUE_NAME, {
    connection
});
