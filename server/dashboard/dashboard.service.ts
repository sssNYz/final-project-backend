import {
  fetchAccountUsageRows,
  type AccountUsageRow,
} from "@/server/dashboard/dashboard.repository"

export interface AccountUsageItem {
  accountId: number
  accountLabel: string
  patientCount: number
  medicationLogCount: number
}

function parseDateOnly(value?: string | null): Date | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed
}

function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export async function getAccountUsageStats(params: {
  fromDate?: string | null
  toDate?: string | null
}): Promise<AccountUsageItem[]> {
  const fromRaw = parseDateOnly(params.fromDate)
  const toRaw = parseDateOnly(params.toDate)

  const from = fromRaw
  const to = toRaw ? endOfDay(toRaw) : undefined

  const rows: AccountUsageRow[] = await fetchAccountUsageRows({
    from: from ?? undefined,
    to: to ?? undefined,
  })

  return rows.map((row) => ({
    accountId: row.userId,
    accountLabel: row.email,
    patientCount: row.profileCount,
    medicationLogCount: row.medicationLogCount,
  }))
}

