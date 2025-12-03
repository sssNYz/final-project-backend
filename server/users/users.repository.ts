import { Prisma } from "@prisma/client";
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
