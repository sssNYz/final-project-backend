import { prisma } from "./server/db/client";
import { processNotificationJob } from "./server/workers/notificationConsumer";

async function run() {
    const job = {
        data: {
            logIds: [610], // Sample
            isSnooze: false
        }
    } as any;
    
    // We are not actually running it to write to db, we just want to compile check.
    /*
    await processNotificationJob(job);
    */
    console.log("TS check passed if this runs");
}
run();
