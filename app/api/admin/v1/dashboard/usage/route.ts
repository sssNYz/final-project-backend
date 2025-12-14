import { NextRequest, NextResponse } from "next/server"

import { withRole } from "@/lib/apiHelpers"
import { getAccountUsageStats } from "@/server/dashboard/dashboard.service"

// GET /api/admin/v1/dashboard/usage
// ดึงสถิติการใช้ยาของผู้ใช้แต่ละบัญชี (จำนวนโปรไฟล์และจำนวน log การใช้ยา)
// สามารถกรองตามช่วงวันที่ด้วย fromDate / toDate และอนุญาตเฉพาะผู้ใช้ที่มีสิทธิ์ Admin ขึ้นไป
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")

  return withRole(request, "Admin", async () => {
    try {
      const items = await getAccountUsageStats({ fromDate, toDate })

      return NextResponse.json(
        {
          items: items.map((item) => ({
            accountId: item.accountId,
            accountLabel: item.accountLabel,
            patientCount: item.patientCount,
            medicationLogCount: item.medicationLogCount,
          })),
        },
        { status: 200 },
      )
    } catch (error: unknown) {
      console.error("Error loading account usage stats:", error)

      const message =
        error instanceof Error
          ? error.message
          : "โหลดข้อมูลปริมาณการใช้ยาไม่สำเร็จ"

      return NextResponse.json(
        { error: message },
        { status: 500 },
      )
    }
  })
}
