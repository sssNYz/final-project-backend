import { Prisma } from "@prisma/client";
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

export async function findUserBySupabaseOrEmail(
  supabaseUserId: string,
  email?: string | null
) {
  return prisma.userAccount.findFirst({
    where: buildUserLookupWhere(supabaseUserId, email),
  });
}

export async function updateUserAccount(
  userId: number,
  data: Prisma.UserAccountUpdateInput
) {
  return prisma.userAccount.update({
    where: { userId },
    data,
  });
}

export async function findAllUserAccounts(skip?: number, take?: number) {
  return prisma.userAccount.findMany({
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function countAllUserAccounts() {
  return prisma.userAccount.count();
}

export async function deleteUserAccount(
  where: Prisma.UserAccountWhereUniqueInput
) {
  return prisma.userAccount.delete({
    where,
  });
}

export async function findUserByUserId(userId: number) {
  return prisma.userAccount.findUnique({
    where: { userId },
  });
}
