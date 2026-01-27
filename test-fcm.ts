import "dotenv/config";
import { prisma } from "./server/db/client";
import { sendFcmMulticast } from "./server/push/fcm";

async function test() {
    console.log("1. Searching for tokens...");
    const tokens = await prisma.deviceToken.findMany();

    if (tokens.length === 0) {
        console.log("❌ No tokens found! Open the mobile app first.");
        return;
    }

    const tokenList = tokens.map(t => t.token);
    console.log(`2. Found ${tokenList.length} token(s). Sending message...`);

    try {
        const response = await sendFcmMulticast({
            tokens: tokenList,
            notification: {
                title: "Test Message",
                body: "Hello! If you see this, the notification system works.",
            },
            data: {
                type: "TEST",
                timestamp: String(Date.now())
            }
        });

        console.log("3. Result:");
        console.log(`   Success: ${response.successCount}`);
        console.log(`   Failure: ${response.failureCount}`);

        if (response.failureCount > 0) {
            console.log("   Errors:", JSON.stringify(response.responses, null, 2));
        } else {
            console.log("   ✅ Message sent successfully to FCM!");
        }

    } catch (err) {
        console.error("❌ Fatal Error sending message:", err);
    }
}

test().then(() => {
    // Helper to ensure connection closes
    return prisma.$disconnect();
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
