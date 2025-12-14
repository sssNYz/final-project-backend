import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface AccountUsageRow {
  userId: number
  email: string
  profileCount: number
  medicationLogCount: number
}

export async function fetchAccountUsageRows(params?: {
  from?: Date
  to?: Date
}): Promise<AccountUsageRow[]> {
  const from = params?.from
  const to = params?.to

  const scheduleFilter: Prisma.MedicationLogWhereInput | undefined =
    from || to
      ? {
          scheduleTime: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : undefined

  const users = await prisma.userAccount.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      userId: true,
      email: true,
      profiles: {
        select: {
          profileId: true,
          medicationLogs: {
            ...(scheduleFilter ? { where: scheduleFilter } : {}),
            select: {
              logId: true,
            },
          },
        },
      },
    },
  })

  return users.map((user) => {
    const profileCount = user.profiles.length
    const medicationLogCount = user.profiles.reduce(
      (total, profile) => total + profile.medicationLogs.length,
      0,
    )

    return {
      userId: user.userId,
      email: user.email,
      profileCount,
      medicationLogCount,
    }
  })
}

