"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { apiUrl } from "@/lib/apiClient"
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
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email || !password || !confirmPassword) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน")
      return
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch(apiUrl("/api/admin/v1/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "ไม่สามารถเพิ่มบัญชีผู้ดูแลระบบได้")
        return
      }

      router.push(`/otp?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย")
    } finally {
      setIsLoading(false)
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
        <main className="flex flex-1 flex-col bg-slate-100">
          <div className="flex flex-1 items-center justify-center px-4 py-6 lg:px-6">
            <Card className="w-full max-w-md rounded-3xl border-none bg-slate-50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-xl font-bold text-slate-900">
                  เพิ่มบัญชีผู้ดูแลระบบ
                </CardTitle>
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
                        disabled={isLoading}
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
                        disabled={isLoading}
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                    </Field>
                    <Field>
                      <Input
                        id="admin-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Confirm Password"
                        required
                        disabled={isLoading}
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <FieldDescription className="mt-1 text-center text-[11px] text-slate-500">
                        รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร
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
                        disabled={isLoading}
                        className="mt-2 w-full rounded-full bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900"
                      >
                        {isLoading
                          ? "กำลังเพิ่มบัญชีผู้ดูแลระบบ..."
                          : "เพิ่มบัญชีผู้ดูแลระบบ"}
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
