"use client"
import { apiUrl } from "@/lib/apiClient"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { cn } from "@/lib/utils"
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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match!")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
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
        setError(data?.error || "Sign up failed")
        return
      }

      router.push(`/otp?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      <Card className="w-full max-w-md rounded-3xl border-none bg-slate-50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-xl font-bold text-slate-900">
            เพิ่มบัญชีผู้ดูแลระบบ
          </CardTitle>
          <p className="mt-2 text-center text-xs text-slate-600">
            สร้างบัญชีผู้ดูแลระบบใหม่ด้วยอีเมลและรหัสผ่าน
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-500"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-500"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-500"
                />
                <FieldDescription className="mt-1 text-xs text-slate-600">
                  Must be at least 8 characters long.
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
                  {isLoading ? "Creating..." : "Create Admin Account"}
                </Button>
              </Field>
              <Field>
                <FieldDescription className="mt-2 text-center text-xs text-slate-600">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-sky-700">
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
