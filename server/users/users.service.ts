import { AuthApiError, User } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import {
  deleteUserAccount,
  findAllUserAccounts,
  findUserBySupabaseOrEmail,
  updateUserAccount,
} from "@/server/users/users.repository";
import { deleteSupabaseUser } from "@/server/supabase/admin";
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
  const user = await findUserBySupabaseOrEmail(
    supabaseUser.id,
    normalizedEmail
  );

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

export interface AdminAccountListItem {
  userId: number;
  email: string;
  role: "admin" | "member";
  active: boolean;
  lastLogin: Date | null;
}

function mapRoleToAccountRole(role: string): "admin" | "member" {
  if (role === "Admin" || role === "SuperAdmin") {
    return "admin";
  }

  return "member";
}

export async function listAdminAccountsForDashboard(): Promise<
  AdminAccountListItem[]
> {
  const users = await findAllUserAccounts();

  return users.map((user) => ({
    userId: user.userId,
    email: user.email,
    role: mapRoleToAccountRole(user.role),
    active: user.deletedAt == null,
    lastLogin: user.lastLogin,
  }));
}

export async function deleteAdminAccount({
  userId,
  email,
}: {
  userId?: number;
  email?: string | null;
}): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const hasValidId = typeof userId === "number" && Number.isInteger(userId) && userId > 0;

  const where: Prisma.UserAccountWhereUniqueInput | null = hasValidId
    ? { userId }
    : normalizedEmail
      ? { email: normalizedEmail }
      : null;

  if (!where) {
    throw new ServiceError(400, {
      error: "จำเป็นต้องระบุ userId หรือ email ที่ถูกต้อง",
    });
  }

  try {
    const deletedUser = await deleteUserAccount(where);

    if (deletedUser.supabaseUserId) {
      const { error } = await deleteSupabaseUser(deletedUser.supabaseUserId);

      if (
        error &&
        (!(error instanceof AuthApiError) || error.status !== 404)
      ) {
        throw new ServiceError(502, {
          error: "ไม่สามารถลบบัญชีบน Supabase ได้",
          supabaseError: error.message,
        });
      }
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ServiceError(404, {
        error: "User not found",
        where,
      });
    }

    throw error;
  }
}
