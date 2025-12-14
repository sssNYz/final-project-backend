"use client"

import { cn } from "@/lib/utils"

type DashboardPageHeaderProps = {
  title: string
  description?: string
  className?: string
}

// Header มุมบนของแต่ละหน้าใน Dashboard
// แสดงชื่อหน้าหลัก (title) และคำอธิบายสั้น ๆ (description)
export function DashboardPageHeader({
  title,
  description,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b bg-slate-50/80 px-4 py-3 lg:px-6",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-slate-800">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-xs text-slate-600">
          {description}
        </p>
      )}
    </header>
  )
}
