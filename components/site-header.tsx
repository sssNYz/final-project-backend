"use client"

import { useState } from "react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const [userEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem("currentUserEmail")
  })

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-gradient-to-r from-slate-600 to-sky-600 text-white transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-white" />
        <Separator
          orientation="vertical"
          className="mx-2 h-6 border-white/40 data-[orientation=vertical]:h-6"
        />
        <h1 className="text-lg font-bold tracking-wide">MediBuddy</h1>
        <div className="ml-auto flex items-center gap-3 pr-2">
          {userEmail && (
            <span className="text-xs font-medium text-slate-100">
              ผู้ใช้งาน: <span className="font-semibold">{userEmail}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
