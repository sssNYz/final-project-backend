"use client"

import { useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AccountRow = {
  name: string
  profiles: number
  rows: number
}

type Props = {
  rows: AccountRow[]
  pageSize?: number
  selectable?: boolean
  onDeleteSelected?: (names: string[]) => void
}

export function AccountUsageTable({
  rows,
  pageSize = 5,
  selectable = false,
  onDeleteSelected,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedNames, setSelectedNames] = useState<string[]>([])

  const { totalPages, paginatedRows } = useMemo(() => {
    const total = Math.max(1, Math.ceil(rows.length / pageSize))
    const safePage = Math.min(currentPage, total)
    const startIndex = (safePage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return {
      totalPages: total,
      paginatedRows: rows.slice(startIndex, endIndex),
    }
  }, [rows, pageSize, currentPage])

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function toggleSelect(name: string) {
    setSelectedNames((prev) =>
      prev.includes(name)
        ? prev.filter((value) => value !== name)
        : [...prev, name],
    )
  }

  function deleteSelected() {
    if (!onDeleteSelected || selectedNames.length === 0) return
    onDeleteSelected(selectedNames)
    setSelectedNames([])
    setCurrentPage(1)
  }

  const hasSelection = selectedNames.length > 0
  const allSelected = rows.length > 0 && selectedNames.length === rows.length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedNames([])
    } else {
      setSelectedNames(rows.map((row) => row.name))
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-700">
            {selectable && (
              <TableHead className="w-10 px-4 py-3 text-center text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  aria-label="เลือกทั้งหมด"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
              บัญชีผู้ใช้
            </TableHead>
            <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
              จำนวนผู้ป่วย
            </TableHead>
            <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
              จำนวนรายการใช้ยา
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRows.map((row) => (
            <TableRow key={row.name} className="even:bg-slate-50/60">
              {selectable && (
                <TableCell className="w-10 text-center text-sm text-slate-700">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.name}`}
                    checked={selectedNames.includes(row.name)}
                    onChange={() => toggleSelect(row.name)}
                  />
                </TableCell>
              )}
              <TableCell className="text-center text-sm font-medium text-slate-800">
                {row.name}
              </TableCell>
              <TableCell className="text-center text-sm text-slate-700">
                {row.profiles}
              </TableCell>
              <TableCell className="text-center text-sm text-slate-700">
                {row.rows}
              </TableCell>
            </TableRow>
          ))}
          {paginatedRows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectable ? 4 : 3}
                className="py-6 text-center text-sm text-slate-500"
              >
                ยังไม่มีข้อมูลในช่วงวันที่ที่เลือก
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
        {selectable && (
          <button
            type="button"
            onClick={deleteSelected}
            disabled={!hasSelection}
            className="rounded-full border border-orange-400 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
          >
            ลบรายการที่เลือก ({selectedNames.length})
          </button>
        )}
        <div className="flex flex-1 items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={!canGoPrev}
            className="text-sky-700 disabled:text-slate-400 disabled:hover:underline-none hover:underline"
          >
            ก่อนหน้า
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              const isActive = page === currentPage
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
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
            onClick={() => goToPage(currentPage + 1)}
            disabled={!canGoNext}
            className="text-sky-700 disabled:text-slate-400 disabled:hover:underline-none hover:underline"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </>
  )
}
