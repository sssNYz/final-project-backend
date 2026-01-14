import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  BatchResponse,
  MulticastMessage,
  getMessaging,
} from "firebase-admin/messaging";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

function getFirebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  const parsed = JSON.parse(raw) as ServiceAccountJson;
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return initializeApp({
    credential: cert(parsed as unknown as Parameters<typeof cert>[0]),
  });
}

export async function sendFcmMulticast(
  message: Omit<MulticastMessage, "tokens"> & { tokens: string[] },
): Promise<BatchResponse> {
  const app = getFirebaseApp();
  const messaging = getMessaging(app);
  return messaging.sendEachForMulticast(message);
}

