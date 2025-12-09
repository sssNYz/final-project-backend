// ... existing code at top ...
"use client"
import { apiUrl } from "@/lib/apiClient"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push("/")
    }
  }, [email, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError("Email is missing")
      return
    }

    if (otp.length !== 6) {
      setError("Code must be 6 digits")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch(apiUrl("/api/admin/v1/verifyOtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: otp,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Verify failed")
        return
      }

      // 2) Get id + access token from response
      const supabaseUserId = data.user?.user?.id
      const accessToken = data.user?.session?.access_token

      if (!supabaseUserId || !accessToken) {
        setError("Invalid verify response")
        return
      }

      // 3) Build body for sync-admin
      const syncBody = {
        supabaseUserId,
        email,
        provider: "email",
        allowMerge: false,
      }

      // 4) Call /api/admin/sync-admin
      const syncRes = await fetch(apiUrl("/api/admin/v1/sync-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(syncBody),
      })

      const syncData = await syncRes.json().catch(() => null)

      if (!syncRes.ok) {
        setError(syncData?.error || "Sync admin failed")
        return
      }

      // 5) Success → go to next page (change path if you want)
      router.push("/dashboard")
    } catch (err) {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Enter verification code</h1>
            <FieldDescription>
              We sent a 6-digit code to your email address
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="otp" className="sr-only">
              Verification code
            </FieldLabel>
            <InputOTP
              maxLength={6}
              id="otp"
              required
              containerClassName="gap-4"
              value={otp}
              onChange={(value) => setOtp(value)}
            >
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription className="text-center">
              Didn&apos;t receive the code? <a href="#">Resend</a>
            </FieldDescription>
          </Field>

          {error && (
            <p className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
// ... existing code ...