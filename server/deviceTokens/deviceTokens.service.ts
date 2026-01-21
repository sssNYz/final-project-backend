import { User } from "@supabase/supabase-js";
import { DeviceToken } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import { findUserBySupabaseOrEmail } from "@/server/auth/auth.repository";
import { upsertDeviceToken } from "@/server/deviceTokens/deviceTokens.repository";

function normalizeEmail(email?: string | null): string | null {
  return typeof email === "string" ? email.toLowerCase().trim() : null;
}

export interface SaveDeviceTokenInput {
  supabaseUser: User;
  token: string;
  platform?: string | null;
  deviceId?: string | null;
}

export interface SaveDeviceTokenResult {
  message: string;
  deviceToken: DeviceToken;
}

/**
 * Save or update a device token for the authenticated user
 */
export async function saveDeviceToken(
  input: SaveDeviceTokenInput
): Promise<SaveDeviceTokenResult> {
  const { supabaseUser, token, platform, deviceId } = input;

  // Validate token
  if (!token || typeof token !== "string" || token.trim().length < 10) {
    throw new ServiceError(400, {
      error: "token is required and must be a valid string (min 10 chars)",
    });
  }

  // Find user in DB
  const normalizedEmail = normalizeEmail(supabaseUser.email);
  const user = await findUserBySupabaseOrEmail(supabaseUser.id, normalizedEmail);

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
      message: "Please call /api/mobile/v1/auth/sync-user first",
    });
  }

  // Upsert token
  const deviceToken = await upsertDeviceToken({
    token: token.trim(),
    userId: user.userId,
    platform: platform ?? null,
    deviceId: deviceId ?? null,
  });

  return {
    message: "Device token saved successfully",
    deviceToken,
  };
}
