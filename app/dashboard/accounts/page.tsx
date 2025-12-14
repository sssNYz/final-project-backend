"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"

import { Search, Trash2, User2 } from "lucide-react"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AccountRole = "admin" | "member"

type AdminAccount = {
  userId: number
  email: string
  role: AccountRole
  active: boolean
  lastLogin: string | null
}

const ROLE_LABELS: Record<AccountRole, string> = {
  admin: "ผู้ดูแลระบบ",
  member: "สมาชิก",
}

const PAGE_SIZE = 4

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<"all" | AccountRole>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [searchEmail, setSearchEmail] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setIsLoading(true)
        setLoadError(null)

        const res = await fetch("/api/admin/v1/users/list")

        const data = await res.json().catch(() => null)

        if (!res.ok) {
          setLoadError(
            (data && (data.error as string | undefined)) ||
              "โหลดข้อมูลบัญชีผู้ใช้ไม่สำเร็จ",
          )
          return
        }

        const items = (data?.accounts ?? []) as {
          userId: number
          email: string
          role: AccountRole
          active: boolean
          lastLogin: string | null
        }[]

        setAccounts(items)
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูลบัญชีผู้ใช้")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  const filteredAccounts = useMemo(() => {
    const search = searchEmail.trim().toLowerCase()

    return accounts.filter((account) => {
      const matchesRole =
        roleFilter === "all" || account.role === roleFilter

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? account.active
            : !account.active

      const matchesSearch =
        search.length === 0 ||
        account.email.toLowerCase().includes(search)

      return matchesRole && matchesStatus && matchesSearch
    })
  }, [accounts, roleFilter, statusFilter, searchEmail])

  const { totalPages, safePage, paginatedAccounts } = useMemo(() => {
    const total = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE))
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      totalPages: total,
      safePage: page,
      paginatedAccounts: filteredAccounts.slice(startIndex, endIndex),
    }
  }, [filteredAccounts, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function handleToggleStatus(userId: number) {
    setAccounts((current) =>
      current.map((account) =>
        account.userId === userId
          ? { ...account, active: !account.active }
          : account,
      ),
    )
  }

  async function handleDeleteAccount(account: AdminAccount) {
    const confirmed = window.confirm(
      `ต้องการลบบัญชีผู้ใช้ ${account.email} หรือไม่?`,
    )
    if (!confirmed) return

    setLoadError(null)

    try {
      const validId =
        typeof account.userId === "number" &&
        Number.isInteger(account.userId) &&
        account.userId > 0
          ? String(account.userId)
          : "0"
      const deleteUrl = `/api/admin/v1/users/${validId}?email=${encodeURIComponent(account.email)}`

      const res = await fetch(deleteUrl, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setLoadError(
          (data && (data.error as string | undefined)) ||
            "ไม่สามารถลบบัญชีผู้ใช้งานได้",
        )
        return
      }

      setAccounts((current) =>
        current.filter((item) => item.userId !== account.userId),
      )
    } catch {
      setLoadError("เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน")
    }
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
            title="บัญชีผู้ใช้งาน"
            description="จัดการสิทธิการใช้งานและสถานะของบัญชี"
          />
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <Card className="shadow-sm">
              {/* <CardHeader className="pb-1">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Filter
                </CardTitle>
              </CardHeader> */}
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {/* <div className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-1 text-xs font-semibold text-white">
                    <User2 className="h-4 w-4" />
                    <span>บัญชีผู้ใช้งาน</span>
                  </div> */}
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="อีเมลสมาชิก"
                      value={searchEmail}
                      onChange={(event) =>
                        setSearchEmail(event.target.value)
                      }
                      className="w-80 max-w-full rounded-full bg-slate-100 pr-10 text-xs text-slate-800 placeholder:text-slate-400"
                    />
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <Select
                    value={roleFilter}
                    onValueChange={(value) =>
                      setRoleFilter(value as "all" | AccountRole)
                    }
                  >
                    <SelectTrigger className="h-9 rounded-full border-none bg-slate-700/90 px-4 text-xs font-medium text-white hover:bg-slate-800/90">
                      <SelectValue placeholder="สิทธิการใช้งาน" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">
                        สิทธิการใช้งานทั้งหมด
                      </SelectItem>
                      <SelectItem value="admin">
                        ผู้ดูแลระบบ
                      </SelectItem>
                      <SelectItem value="member">
                        สมาชิก
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(
                        value as "all" | "active" | "inactive",
                      )
                    }
                  >
                    <SelectTrigger className="h-9 rounded-full border-none bg-slate-700/90 px-4 text-xs font-medium text-white hover:bg-slate-800/90">
                      <SelectValue placeholder="สถานะการใช้งาน" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">
                        สถานะการใช้งานทั้งหมด
                      </SelectItem>
                      <SelectItem value="active">ON</SelectItem>
                      <SelectItem value="inactive">OFF</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    className="rounded-full bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-600"
                    asChild
                  >
                    <a href="/dashboard/accounts/new-admin">
                      + เพิ่มบัญชีผู้ดูแลระบบ
                    </a>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                  <p>
                    {isLoading ? (
                      <span>กำลังโหลดข้อมูลบัญชีผู้ใช้งาน...</span>
                    ) : (
                      <>
                        พบผู้ใช้ทั้งหมด{" "}
                        <span className="font-semibold text-slate-800">
                          {filteredAccounts.length}
                        </span>{" "}
                        บัญชี
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {loadError && (
              <p className="text-sm text-red-500">{loadError}</p>
            )}

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700">
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        ชื่อบัญชีผู้ใช้งาน
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        สิทธิการใช้งาน
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        สถานะการใช้งาน
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        วันที่เข้าสู่ระบบล่าสุด
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        จัดการ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccounts.map((account) => (
                      <TableRow
                        key={account.userId}
                        className="even:bg-slate-50/70"
                      >
                        <TableCell className="px-4 py-3 text-sm font-medium text-slate-800">
                          {account.email}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                          {ROLE_LABELS[account.role]}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatus(account.userId)
                            }
                            className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold shadow-sm transition-colors ${
                              account.active
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-red-500 bg-red-500 text-white"
                            }`}
                            aria-pressed={account.active}
                          >
                            <span>{account.active ? "ON" : "OFF"}</span>
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  account.active
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                                }`}
                              />
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                          {account.lastLogin}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAccount(account)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
                            aria-label={`ลบบัญชีผู้ใช้ ${account.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && paginatedAccounts.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-sm text-slate-500"
                        >
                          ไม่พบบัญชีผู้ใช้ตามเงื่อนไขที่เลือก
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="text-xs text-slate-500">
                    หน้า {safePage} จาก {totalPages}
                  </span>
                  <div className="flex flex-1 items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={!canGoPrev}
                      className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                    >
                      ก่อนหน้า
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1
                        const isActive = page === safePage
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                              isActive
                                ? "bg-sky-700 text-white"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={!canGoNext}
                      className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
