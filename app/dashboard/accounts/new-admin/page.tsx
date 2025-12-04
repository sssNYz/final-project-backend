"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function NewAdminPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน")
      return
    }

    // ยังไม่เชื่อมฐานข้อมูล: แสดง alert แล้วพากลับหน้ารายการ
    window.alert(
      `จำลองการสร้างบัญชีผู้ดูแลระบบสำเร็จ\n\nสถานะ: ${
        active ? "ใช้งานได้" : "ไม่ให้ใช้งาน"
      }`,
    )
    router.push("/dashboard/accounts")
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
        <main className="flex flex-1 flex-col bg-slate-100">
          <div className="flex flex-1 items-center justify-center px-4 py-6 lg:px-6">
            <Card className="w-full max-w-md rounded-3xl border-none bg-slate-50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-xl font-bold text-slate-900">
                  เพิ่มบัญชีผู้ดูแลระบบ
                </CardTitle>
                <p className="mt-2 text-center text-xs text-slate-600">
                  เพิ่มบัญชีผู้ดูแลระบบ โดยกำหนดอีเมล รหัสผ่าน
                  และสถานะการใช้งานระบบ
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <FieldGroup className="space-y-4">
                    <Field>
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="email"
                        required
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                    </Field>
                    <Field>
                      <Input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        required
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                    </Field>
                    <Field className="space-y-2">
                      <FieldLabel className="text-center text-xs text-slate-700">
                        Status
                      </FieldLabel>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setActive((prev) => !prev)}
                          className={`flex items-center rounded-full px-2 py-1 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-300 text-slate-700"
                          }`}
                          aria-pressed={active}
                        >
                          <span className="px-2">
                            {active ? "ON" : "OFF"}
                          </span>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                            <span
                              className={`h-3 w-3 rounded-full ${
                                active ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                      <FieldDescription className="text-center text-[11px] text-slate-500">
                        {active
                          ? "สถานะ: ใช้งานได้"
                          : "สถานะ: ไม่ให้ใช้งาน"}
                      </FieldDescription>
                    </Field>
                    {error && (
                      <p className="text-center text-sm text-red-500">
                        {error}
                      </p>
                    )}
                    <Field>
                      <Button
                        type="submit"
                        className="mt-2 w-full rounded-full bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900"
                      >
                        เพิ่มบัญชีผู้ดูแลระบบ
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
