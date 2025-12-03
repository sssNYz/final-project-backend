import { User } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import {
  findUserBySupabaseOrEmail,
  updateUserAccount,
} from "@/server/users/users.repository";
import {
  PublicUserAccount,
  serializeUserAccount,
} from "@/server/users/userAccount.serializer";

const ALLOWED_UPDATE_FIELDS = ["tutorialDone"] as const;
type AllowedUpdateField = (typeof ALLOWED_UPDATE_FIELDS)[number];

function normalizeEmail(email?: string | null): string | null {
  return typeof email === "string" ? email.toLowerCase().trim() : null;
}

function buildUpdatePayload(
  body: Record<string, unknown>
): Prisma.UserAccountUpdateInput {
  type UpdateValue = Prisma.UserAccountUpdateInput[AllowedUpdateField];
  const data: Partial<Record<AllowedUpdateField, UpdateValue>> = {};

  ALLOWED_UPDATE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field] as UpdateValue;
    }
  });

  return data as Prisma.UserAccountUpdateInput;
}

export async function updateCurrentUserProfile({
  supabaseUser,
  body,
}: {
  supabaseUser: User;
  body: Record<string, unknown>;
}): Promise<{ message: string; user: PublicUserAccount }> {
  const normalizedEmail = normalizeEmail(supabaseUser.email);
  const user = await findUserBySupabaseOrEmail(supabaseUser.id, normalizedEmail);

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
      message: "Please call /api/mobile/v1/auth/sync-user to create your account",
    });
  }

  const updateData = buildUpdatePayload(body);

  if (Object.keys(updateData).length === 0) {
    throw new ServiceError(400, {
      error: "No valid fields to update",
      allowedFields: ALLOWED_UPDATE_FIELDS,
    });
  }

  const updatedUser = await updateUserAccount(user.userId, updateData);

  return {
    message: "User updated successfully",
    user: serializeUserAccount(updatedUser),
  };
}
