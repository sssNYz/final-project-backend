import { Prisma } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import {
  deleteUserAccount,
  findAllUserAccounts,
  countAllUserAccounts,
  findUserByUserId,
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
  userId,
  body,
}: {
  userId: number;
  body: Record<string, unknown>;
}): Promise<{ message: string; user: PublicUserAccount }> {

  const user = await findUserByUserId(userId);

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
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
  role: "admin" | "superadmin" | "member";
  active: boolean;
  lastLogin: Date | null;
}

function mapRoleToAccountRole(role: string): "admin" | "superadmin" | "member" {
  if (role === "SuperAdmin") {
    return "superadmin";
  }
  if (role === "Admin") {
    return "admin";
  }

  return "member";
}

export async function listAdminAccountsForDashboard(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  accounts: AdminAccountListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [users, total] = await Promise.all([
    findAllUserAccounts(skip, take),
    countAllUserAccounts(),
  ]);

  return {
    accounts: users.map((user) => ({
      userId: user.userId,
      email: user.email,
      role: mapRoleToAccountRole(user.role),
      active: user.status === true,
      lastLogin: user.lastLogin,
    })),
    total,
    page,
    pageSize,
  };
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
    await deleteUserAccount(where);
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


export async function adminUpdateUserStatus(
  userId: number,
  status: boolean
): Promise<PublicUserAccount> {
  const user = await findUserByUserId(userId);

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found",
    });
  }

  if (user.role === "SuperAdmin") {
    throw new ServiceError(403, {
      error: "Cannot change status of SuperAdmin",
    });
  }

  const updatedUser = await updateUserAccount(userId, { status });

  return serializeUserAccount(updatedUser);
}
