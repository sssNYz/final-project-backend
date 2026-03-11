import { prisma } from "@/lib/prisma";
import { DeviceToken } from "@prisma/client";

/**
 * Find all device tokens for a user (not revoked)
 */
export async function findDeviceTokensByUserId(
  userId: number
): Promise<DeviceToken[]> {
  return prisma.deviceToken.findMany({
    where: {
      userId,
    },
  });
}

/**
 * Upsert a device token by token string
 * - If token exists: update userId, platform, deviceId, lastSeenAt, clear revokedAt
 * - If token not exists: create new row
 */
export async function upsertDeviceToken(data: {
  token: string;
  userId: number;
  platform?: string | null;
  deviceId?: string | null;
}): Promise<DeviceToken> {
  return prisma.deviceToken.upsert({
    where: { token: data.token },
    create: {
      token: data.token,
      userId: data.userId,
      platform: data.platform ?? null,
      deviceId: data.deviceId ?? null,
      lastSeenAt: new Date(),
    },
    update: {
      userId: data.userId,
      platform: data.platform ?? null,
      deviceId: data.deviceId ?? null,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Delete a device token (hard delete) - used when FCM says token is invalid
 */
export async function deleteDeviceToken(token: string): Promise<void> {
  await prisma.deviceToken.delete({
    where: { token },
  });
}
