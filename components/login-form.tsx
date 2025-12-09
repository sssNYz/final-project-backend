"use client"
import { apiUrl } from "@/lib/apiClient"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Please enter email and password")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch(apiUrl("/api/admin/v1/signin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Login failed")
        return
      }

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken)
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken)
      }
      if (data.user?.email || email) {
        localStorage.setItem(
          "currentUserEmail",
          (data.user?.email as string | undefined) ?? email,
        )
      }

      router.push("/dashboard")
    } catch (err) {
      setError("Network error. Please try again.")
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
      <Card className="w-full max-w-md rounded-3xl border-none bg-white shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="text-center text-2xl font-bold text-slate-900">
            LogIn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup className="space-y-4">
              <Field>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-500"
                />
              </Field>
              <Field>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-500"
                />
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
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
