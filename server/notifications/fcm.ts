import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

let messagingInstance: Messaging | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses Way B: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Falls back to GOOGLE_APPLICATION_CREDENTIALS if env vars not set
 */
function initFirebase() {
  // Already initialized
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Way B: Use 3 env vars
  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("✅ Firebase Admin initialized with env vars");
      return;
    } catch (error) {
      console.error("❌ Failed to initialize Firebase with env vars:", error);
      throw error;
    }
  }

  // Fallback: Use GOOGLE_APPLICATION_CREDENTIALS file path
  try {
    initializeApp();
    console.log("✅ Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    throw new Error(
      "Firebase Admin initialization failed. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or set GOOGLE_APPLICATION_CREDENTIALS"
    );
  }
}

/**
 * Get Firebase Messaging instance (initializes if needed)
 */
export function getFirebaseMessaging(): Messaging {
  if (!messagingInstance) {
    initFirebase();
    messagingInstance = getMessaging();
  }
  return messagingInstance;
}

/**
 * Send push notification to a single FCM token
 */
export async function sendPushToToken(input: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<string> {
  const messaging = getFirebaseMessaging();

  const message = {
    token: input.token,
    notification: {
      title: input.title,
      body: input.body,
    },
    data: input.data || {},
  };

  try {
    const response = await messaging.send(message);
    console.log("✅ Push notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Failed to send push notification:", error);
    throw error;
  }
}

