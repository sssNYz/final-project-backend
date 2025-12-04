"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"

import {
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Search,
  X,
} from "lucide-react"

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

type RequestStatus = "pending" | "rejected" | "completed"

type RequestCategory =
  | "data-info"
  | "usage-problem"
  | "feature"
  | "other"

type RequestRow = {
  id: string
  email: string
  category: RequestCategory
  status: RequestStatus
  submittedDate: string
  subject: string
  content: string
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "รอยืนยัน",
  rejected: "ปฏิเสธ",
  completed: "เสร็จสิ้น",
}

const STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  pending:
    "border-orange-400 bg-orange-100 text-orange-700",
  rejected: "border-red-400 bg-red-100 text-red-700",
  completed:
    "border-emerald-500 bg-emerald-100 text-emerald-700",
}

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  "data-info": "คำร้องขอข้อมูลยา",
  "usage-problem": "ปัญหาการใช้งาน",
  feature: "ฟังก์ชันการทำงาน",
  other: "อื่นๆ",
}

const PAGE_SIZE = 4

const initialRequests: RequestRow[] = [
  {
    id: "REQ-2025-0001",
    email: "Sunny@gmail.com",
    category: "usage-problem",
    status: "pending",
    submittedDate: "2025-04-02",
    subject: "เพิ่มบัญชีผู้ใช้ไม่ได้",
    content: "กดเพิ่มบัญชีผู้ใช้ไม่ได้ กรุณาช่วยตรวจสอบให้ด้วยค่ะ",
  },
  {
    id: "REQ-2025-0002",
    email: "Dook@gmail.com",
    category: "usage-problem",
    status: "pending",
    submittedDate: "2025-05-02",
    subject: "ข้อมูลการใช้งานไม่อัปเดต",
    content: "รายละเอียดการใช้งานไม่อัปเดตหลังจากเพิ่มข้อมูลใหม่",
  },
  {
    id: "REQ-2025-0003",
    email: "Deer@gmail.com",
    category: "feature",
    status: "rejected",
    submittedDate: "2025-06-19",
    subject: "เสนอเพิ่มฟังก์ชันแจ้งเตือน",
    content: "อยากให้แอปมีการแจ้งเตือนก่อนเวลารับประทานยา 30 นาที",
  },
  {
    id: "REQ-2025-0004",
    email: "Cartoon@gmail.com",
    category: "feature",
    status: "completed",
    submittedDate: "2025-01-25",
    subject: "เพิ่มปุ่มลัดดูประวัติ",
    content: "ขอปุ่มลัดสำหรับดูประวัติการรับประทานยาหน้าแรก",
  },
  {
    id: "REQ-2025-0005",
    email: "user1@example.com",
    category: "data-info",
    status: "pending",
    submittedDate: "2025-04-10",
    subject: "ขอข้อมูลยาเพิ่มเติม",
    content: "ต้องการรายละเอียดผลข้างเคียงของยาที่ใช้อยู่",
  },
  {
    id: "REQ-2025-0006",
    email: "user2@example.com",
    category: "data-info",
    status: "completed",
    submittedDate: "2025-03-28",
    subject: "ขอส่งออกข้อมูลการรักษา",
    content: "ต้องการไฟล์สรุปประวัติการรับประทานยาเพื่อไปพบแพทย์",
  },
  {
    id: "REQ-2025-0007",
    email: "user3@example.com",
    category: "other",
    status: "rejected",
    submittedDate: "2025-02-14",
    subject: "ลบประวัติการใช้งาน",
    content: "ต้องการลบประวัติการใช้งานทั้งหมดจากระบบ",
  },
  {
    id: "REQ-2025-0008",
    email: "user4@example.com",
    category: "usage-problem",
    status: "pending",
    submittedDate: "2025-05-20",
    subject: "แอปเด้งออกเอง",
    content: "แอปปิดตัวเองอัตโนมัติเมื่อกดเข้าเมนูดูประวัติยา",
  },
]

function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year.slice(-2)}`
}

export default function RequestsPage() {
  const [requests, setRequests] =
    useState<RequestRow[]>(initialRequests)
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | RequestCategory
  >("all")
  const [statusFilter, setStatusFilter] = useState<
    "all" | RequestStatus
  >("all")
  const [searchEmail, setSearchEmail] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeRequest, setActiveRequest] =
    useState<RequestRow | null>(null)

  const filteredRequests = useMemo(() => {
    const search = searchEmail.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesCategory =
        categoryFilter === "all" ||
        request.category === categoryFilter

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter

      const matchesSearch =
        search.length === 0 ||
        request.email.toLowerCase().includes(search)

      const dateValue = new Date(
        request.submittedDate,
      ).getTime()
      const afterFrom = fromDate
        ? dateValue >= new Date(fromDate).getTime()
        : true
      const beforeTo = toDate
        ? dateValue <= new Date(toDate).getTime()
        : true

      return (
        matchesCategory &&
        matchesStatus &&
        matchesSearch &&
        afterFrom &&
        beforeTo
      )
    })
  }, [requests, categoryFilter, statusFilter, searchEmail, fromDate, toDate])

  const {
    totalPages,
    safePage,
    paginatedRequests,
    pendingCount,
    rejectedCount,
    completedCount,
  } = useMemo(() => {
    const pending = filteredRequests.filter(
      (item) => item.status === "pending",
    ).length
    const rejected = filteredRequests.filter(
      (item) => item.status === "rejected",
    ).length
    const completed = filteredRequests.filter(
      (item) => item.status === "completed",
    ).length

    const total = Math.max(
      1,
      Math.ceil(filteredRequests.length / PAGE_SIZE),
    )
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      totalPages: total,
      safePage: page,
      paginatedRequests: filteredRequests.slice(
        startIndex,
        endIndex,
      ),
      pendingCount: pending,
      rejectedCount: rejected,
      completedCount: completed,
    }
  }, [filteredRequests, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function updateStatus(id: string, status: RequestStatus) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    )
  }

  function openRequestDetail(request: RequestRow) {
    setActiveRequest(request)
  }

  function closeRequestDetail() {
    setActiveRequest(null)
  }

  function resolveFromDetail(status: Exclude<RequestStatus, "pending">) {
    if (!activeRequest) return
    updateStatus(activeRequest.id, status)
    setActiveRequest(null)
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
            title="รายการคำร้องจากผู้ใช้"
            description="ดู จัดการ และเปลี่ยนสถานะคำร้องต่างๆ จากผู้ใช้งานระบบ"
          />
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-1 text-xs font-semibold text-white">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-400 text-[11px]">
                      !
                    </span>
                    <span>คำร้องจากผู้ใช้</span>
                  </div>

                  <Select
                    value={categoryFilter}
                    onValueChange={(value) =>
                      setCategoryFilter(
                        value as "all" | RequestCategory,
                      )
                    }
                  >
                    <SelectTrigger className="h-9 rounded-full border-none bg-slate-700/90 px-4 text-xs font-medium text-white hover:bg-slate-800/90">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">
                        หมวดหมู่คำร้องทั้งหมด
                      </SelectItem>
                      <SelectItem value="data-info">
                        คำร้องขอข้อมูลยา
                      </SelectItem>
                      <SelectItem value="usage-problem">
                        ปัญหาการใช้งาน
                      </SelectItem>
                      <SelectItem value="feature">
                        ฟังก์ชันการทำงาน
                      </SelectItem>
                      <SelectItem value="other">
                        อื่นๆ
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(
                        value as "all" | RequestStatus,
                      )
                    }
                  >
                    <SelectTrigger className="h-9 rounded-full border-none bg-slate-700/90 px-4 text-xs font-medium text-white hover:bg-slate-800/90">
                      <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">
                        สถานะคำร้องทั้งหมด
                      </SelectItem>
                      <SelectItem value="pending">
                        รอยืนยัน
                      </SelectItem>
                      <SelectItem value="rejected">
                        ปฏิเสธ
                      </SelectItem>
                      <SelectItem value="completed">
                        เสร็จสิ้น
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative ml-auto">
                    <Input
                      type="text"
                      placeholder="อีเมลผู้ส่งคำร้อง"
                      value={searchEmail}
                      onChange={(event) =>
                        setSearchEmail(event.target.value)
                      }
                      className="w-64 rounded-full bg-slate-100 pr-10 text-xs text-slate-800 placeholder:text-slate-400"
                    />
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
                  <span>เริ่มต้นที่</span>
                  <div className="relative">
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(event) =>
                        setFromDate(event.target.value)
                      }
                      className="w-40 rounded-full bg-slate-100 pr-10 text-xs"
                    />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <span>จนถึง</span>
                  <div className="relative">
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(event) =>
                        setToDate(event.target.value)
                      }
                      className="w-40 rounded-full bg-slate-100 pr-10 text-xs"
                    />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">
                  รายการคำร้อง
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-1 md:flex-row">
                <div className="flex w-full flex-row gap-3 md:w-56 md:flex-col">
                  <div className="flex flex-1 items-center gap-3 rounded-r-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white">
                    <span className="h-10 w-2 rounded-full bg-orange-300" />
                    <div className="flex flex-col">
                      <span className="text-lg font-bold leading-tight">
                        {pendingCount}
                      </span>
                      <span className="text-[11px] leading-tight">
                        รอยืนยัน
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 items-center gap-3 rounded-r-full bg-red-500 px-4 py-2 text-xs font-semibold text-white">
                    <span className="h-10 w-2 rounded-full bg-red-300" />
                    <div className="flex flex-col">
                      <span className="text-lg font-bold leading-tight">
                        {rejectedCount}
                      </span>
                      <span className="text-[11px] leading-tight">
                        ปฏิเสธ
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 items-center gap-3 rounded-r-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white">
                    <span className="h-10 w-2 rounded-full bg-emerald-300" />
                    <div className="flex flex-col">
                      <span className="text-lg font-bold leading-tight">
                        {completedCount}
                      </span>
                      <span className="text-[11px] leading-tight">
                        เสร็จสิ้น
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-700">
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          วันที่ส่งคำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          อีเมลผู้ส่งคำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          หมวดหมู่คำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          สถานะคำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          จัดการ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className="even:bg-slate-50/60"
                        >
                          <TableCell className="px-4 py-3 text-center text-sm font-medium text-slate-800">
                            {formatDisplayDate(request.submittedDate)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {request.email}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {CATEGORY_LABELS[request.category]}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            <span
                              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[request.status]}`}
                            >
                              {STATUS_LABELS[request.status]}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                openRequestDetail(request)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200"
                              aria-label="ดูรายละเอียดคำร้อง"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedRequests.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-slate-500"
                          >
                            ไม่พบคำร้องตามเงื่อนไขที่เลือก
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
                        {Array.from(
                          { length: totalPages },
                          (_, index) => {
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
                          },
                        )}
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
                </div>
              </CardContent>
            </Card>

            {activeRequest && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
                <div className="relative w-[min(720px,100%)] rounded-3xl bg-gradient-to-br from-sky-900 via-sky-700 to-slate-700 p-6 text-white shadow-2xl">
                  <button
                    type="button"
                    onClick={closeRequestDetail}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600"
                    aria-label="ปิดหน้ารายละเอียดคำร้อง"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h2 className="mb-4 text-center text-lg font-semibold">
                    คำร้องจากผู้ใช้
                  </h2>
                  <div className="grid gap-4 md:grid-cols-[1.1fr,1.7fr]">
                    <div className="space-y-4 rounded-3xl bg-white/10 p-4">
                      <div className="rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-semibold text-slate-800">
                        STATUS :{" "}
                        <span className="text-sky-700">
                          {STATUS_LABELS[activeRequest.status]}
                        </span>
                      </div>
                      <div className="flex h-40 items-center justify-center rounded-3xl bg-white">
                        <ImageIcon className="h-16 w-16 text-slate-300" />
                      </div>
                    </div>
                    <div className="space-y-3 rounded-3xl bg-white/5 p-4 text-xs">
                      <div className="space-y-1">
                        <div className="font-semibold">
                          อีเมลผู้ส่งคำร้อง
                        </div>
                        <div className="rounded-full bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                          {activeRequest.email}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold">
                          หมวดหมู่คำร้อง
                        </div>
                        <div className="rounded-full bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                          {CATEGORY_LABELS[activeRequest.category]}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold">ชื่อหัวข้อ</div>
                        <div className="rounded-full bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                          {activeRequest.subject}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold">
                          เนื้อหาคำร้อง
                        </div>
                        <div className="min-h-[96px] rounded-2xl bg-white/90 px-4 py-3 text-[11px] text-slate-800">
                          {activeRequest.content}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      onClick={() => resolveFromDetail("rejected")}
                      className="flex-1 rounded-full bg-red-500 text-xs font-semibold text-white hover:bg-red-600"
                    >
                      ปฏิเสธ
                    </Button>
                    <Button
                      type="button"
                      onClick={() => resolveFromDetail("completed")}
                      className="flex-1 rounded-full bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      เสร็จสิ้น
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
