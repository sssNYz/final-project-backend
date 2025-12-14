/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import type { CSSProperties } from "react"
import { useEffect, useState } from "react"

import { CalendarDays } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AccountUsageTable } from "@/components/account-usage-table"

type AccountRow = {
  name: string
  profiles: number
  rows: number
}

// หน้า Dashboard หลัก (ปริมาณข้อมูลในระบบ)
// แสดงสรุปจำนวนโปรไฟล์ผู้ใช้และจำนวน log การใช้ยาต่อบัญชี
// พร้อมตัวกรองช่วงวันที่ และตารางสรุป
export default function Page() {
  const [rows, setRows] = useState<AccountRow[]>([])
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ดึงข้อมูลการใช้ยาตามช่วงวันที่จาก API เมื่อตัวกรองวันที่เปลี่ยน
  useEffect(() => {
    async function fetchUsage() {
      try {
        setIsLoading(true)
        setLoadError(null)

        const params = new URLSearchParams()
        if (fromDate) params.set("fromDate", fromDate)
        if (toDate) params.set("toDate", toDate)

        const query = params.toString()
        const url = query
          ? `/api/admin/v1/dashboard/usage?${query}`
          : "/api/admin/v1/dashboard/usage"

        const accessToken =
          typeof window !== "undefined"
            ? window.localStorage.getItem("accessToken")
            : null

        const headers: Record<string, string> = {}
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }

        const res = await fetch(url, {
          headers,
        })
        const data = await res.json().catch(() => null)

        if (!res.ok) {
          setLoadError(
            (data && (data.error as string | undefined)) ||
              "โหลดข้อมูลปริมาณการใช้ยาไม่สำเร็จ",
          )
          setRows([])
          return
        }

        const items = (data?.items ?? []) as {
          accountId: number
          accountLabel: string
          patientCount: number
          medicationLogCount: number
        }[]

        const nextRows: AccountRow[] = items.map((item) => ({
          name: item.accountLabel,
          profiles: item.patientCount,
          rows: item.medicationLogCount,
        }))

        setRows(nextRows)
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูลปริมาณการใช้ยา")
        setRows([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [fromDate, toDate])

  // ลบแถวที่ถูกเลือกออกจาก state (ฝั่ง UI เท่านั้น ไม่เรียก API ลบจริง)
  function handleDeleteSelected(names: string[]) {
    setRows((current) =>
      current.filter((row) => !names.includes(row.name)),
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col bg-background">
          <DashboardPageHeader
            title="ปริมาณข้อมูลในระบบ"
            description="สรุปจำนวนข้อมูลประวัติการรับประทานยาของผู้ใช้ในระบบ"
          />
          <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <Card className="shadow-sm">
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
                  <span>วันที่รับประทานยา</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="w-40 rounded-full bg-slate-100"
                      />
                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <span>ถึง</span>
                    <div className="relative">
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        className="w-40 rounded-full bg-slate-100"
                      />
                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  {isLoading ? (
                    <span>กำลังโหลดข้อมูล...</span>
                  ) : (
                    <>
                      พบรายการ{" "}
                      <span className="font-semibold">
                        {rows.length}
                      </span>{" "}
                      บัญชี
                    </>
                  )}
                </p>
                {loadError && (
                  <p className="text-xs text-red-500">{loadError}</p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <AccountUsageTable
                  rows={rows}
                  selectable
                  onDeleteSelected={handleDeleteSelected}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
