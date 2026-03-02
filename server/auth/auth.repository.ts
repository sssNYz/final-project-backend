import { Prisma, UserAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function buildUserLookupWhere(
  supabaseUserId: string,
  email?: string | null
): Prisma.UserAccountWhereInput {
  const conditions: Prisma.UserAccountWhereInput[] = [];

  if (supabaseUserId) {
    conditions.push({ supabaseUserId });
  }

  if (email) {
    conditions.push({ email });
  }

  return conditions.length > 0 ? { OR: conditions } : {};
}

export async function findUserByEmail(email: string) {
  return prisma.userAccount.findUnique({
    where: { email },
  });
}

export async function findUserBySupabaseOrEmail(
  supabaseUserId: string,
  email?: string | null
) {
  return prisma.userAccount.findFirst({
    where: buildUserLookupWhere(supabaseUserId, email),
  });
}

export async function findUserWithProfilesBySupabaseOrEmail(
  supabaseUserId: string,
  email?: string | null
) {
  return prisma.userAccount.findFirst({
    where: buildUserLookupWhere(supabaseUserId, email),
    include: {
      profiles: {
        select: {
          profileId: true,
          profileName: true,
          profilePicture: true,
        },
      },
    },
  });
}

export async function createUserAccount(data: {
  email: string;
  supabaseUserId: string;
  provider: string;
}) {
  return prisma.userAccount.create({
    data: {
      email: data.email,
      supabaseUserId: data.supabaseUserId,
      provider: data.provider,
      password: null,
      lastLogin: new Date(),
    },
  });
}

export async function updateUserAccount(
  userId: number,
  data: Prisma.UserAccountUpdateInput
): Promise<UserAccount> {
  return prisma.userAccount.update({
    where: { userId },
    data,
  });
}

// Password Reset Token Methods

export async function createPasswordResetToken({
  token,
  userId,
  expiresAt,
}: {
  token: string;
  userId: number;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

export async function findPasswordResetToken(token: string) {
  return prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function deletePasswordResetToken(tokenId: number) {
  return prisma.passwordResetToken.delete({
    where: { id: tokenId },
  });
}

export async function deleteAllUserPasswordResetTokens(userId: number) {
  return prisma.passwordResetToken.deleteMany({
    where: { userId },
  });
}
