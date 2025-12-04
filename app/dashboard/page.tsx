/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"

import { CalendarDays, ChartBar } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  date: string
}

const initialAccountRows: AccountRow[] = [
  { name: "บัญชีผู้ใช้ A", profiles: 3, rows: 120, date: "2025-03-01" },
  { name: "บัญชีผู้ใช้ B", profiles: 5, rows: 240, date: "2025-03-10" },
  { name: "บัญชีผู้ใช้ C", profiles: 2, rows: 86, date: "2025-03-20" },
]

export default function Page() {
  const [rows, setRows] = useState(initialAccountRows)
  const [selectionMode, setSelectionMode] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const filteredRows = useMemo(() => {
    if (!fromDate && !toDate) {
      return rows
    }

    return rows.filter((row) => {
      const dateValue = new Date(row.date).getTime()
      if (Number.isNaN(dateValue)) return true

      const afterFrom = fromDate
        ? dateValue >= new Date(fromDate).getTime()
        : true
      const beforeTo = toDate ? dateValue <= new Date(toDate).getTime() : true

      return afterFrom && beforeTo
    })
  }, [rows, fromDate, toDate])

  function handleDeleteAll() {
    if (rows.length === 0) return
    const confirmed = window.confirm("ต้องการลบข้อมูลทั้งหมดหรือไม่?")
    if (!confirmed) return
    setRows([])
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev)
  }

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
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-1 text-xs font-semibold text-white">
                  <ChartBar className="h-4 w-4" />
                  <span>ปริมาณข้อมูล</span>
                </div>
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
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-600"
                      type="button"
                      onClick={handleDeleteAll}
                    >
                      ลบข้อมูลทั้งหมด
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={toggleSelectionMode}
                      className={`rounded-full border-orange-400 px-4 text-xs font-semibold hover:bg-orange-200 ${
                        selectionMode
                          ? "bg-orange-200 text-orange-800"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      ลบข้อมูลทีละรายการ
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  พบรายการ{" "}
                  <span className="font-semibold">{filteredRows.length}</span>{" "}
                  รายการ :
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
              <Card className="flex flex-col items-center justify-center py-6">
                <div className="text-sm font-medium text-slate-700">
                  ปริมาณข้อมูลในระบบ
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <div className="relative h-40 w-40">
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-sky-600 via-sky-400 to-cyan-400" />
                    <div className="absolute inset-4 flex items-center justify-center rounded-full bg-background">
                      <span className="text-3xl font-extrabold text-sky-700">
                        78%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <AccountUsageTable
                    rows={filteredRows}
                    selectable={selectionMode}
                    onDeleteSelected={handleDeleteSelected}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
