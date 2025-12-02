import { Prisma, UserAccount } from "@prisma/client";
import { prisma } from "@/server/db/client";

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
