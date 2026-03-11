import { DeviceToken } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import { findUserByUserId } from "@/server/users/users.repository";
import { upsertDeviceToken } from "@/server/deviceTokens/deviceTokens.repository";

export interface SaveDeviceTokenInput {
  userId: number;
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
  const { userId, token, platform, deviceId } = input;

  // Validate token
  if (!token || typeof token !== "string" || token.trim().length < 10) {
    throw new ServiceError(400, {
      error: "token is required and must be a valid string (min 10 chars)",
    });
  }

  // Find user in DB
  const user = await findUserByUserId(userId);

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
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
