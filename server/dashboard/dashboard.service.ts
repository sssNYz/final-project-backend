import {
  fetchAccountUsageRows,
  fetchGlobalLogDateRange,
  type AccountUsageRow,
} from "@/server/dashboard/dashboard.repository"
import { getNativeTimezoneOffset } from "@/server/common/timezone"

export interface AccountUsageStatsResult {
  items: AccountUsageItem[]
  globalMinDate: Date | null
  globalMaxDate: Date | null
}

export interface AccountUsageItem {
  accountId: number
  accountLabel: string
  patientCount: number
  medicationLogCount: number
}

function parseDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  return trimmed
}

export async function getAccountUsageStats(params: {
  fromDate?: string | null
  toDate?: string | null
}): Promise<AccountUsageStatsResult> {
  const adminTimeZone = "Asia/Bangkok"

  const fromRaw = parseDateOnly(params.fromDate) // e.g., "2026-03-01"
  const toRaw = parseDateOnly(params.toDate)

  // Convert exact strings to the Start/End UTC limits of a Thai calendar day
  let fromUtc: Date | undefined = undefined
  let toUtc: Date | undefined = undefined

  if (fromRaw) {
    const localDate = new Date(`${fromRaw}T00:00:00Z`)
    const offset = getNativeTimezoneOffset(adminTimeZone, localDate);
    fromUtc = new Date(localDate.getTime() - offset);
  }

  if (toRaw) {
    const localDate = new Date(`${toRaw}T23:59:59.999Z`)
    const offset = getNativeTimezoneOffset(adminTimeZone, localDate);
    toUtc = new Date(localDate.getTime() - offset);
  }

  const [rows, globalRange] = await Promise.all([
    fetchAccountUsageRows({
      from: fromUtc,
      to: toUtc,
    }),
    fetchGlobalLogDateRange(),
  ])

  const items = rows.map((row) => ({
    accountId: row.userId,
    accountLabel: row.email,
    patientCount: row.profileCount,
    medicationLogCount: row.medicationLogCount,
  }))

  return {
    items,
    globalMinDate: globalRange.minDate,
    globalMaxDate: globalRange.maxDate,
  }
}

