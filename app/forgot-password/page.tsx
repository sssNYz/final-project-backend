"use client"

import { useState } from "react"

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) return
    // ยังไม่เชื่อมต่อระบบส่งอีเมลจริง แสดงข้อความแทน
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>รีเซ็ตรหัสผ่าน</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">อีเมลที่ใช้สมัคร</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <FieldDescription>
                    ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลนี้ (จำลอง)
                  </FieldDescription>
                </Field>
                {submitted && (
                  <p className="text-sm text-emerald-600">
                    ระบบบันทึกคำขอแล้ว กรุณาตรวจสอบกล่องอีเมลของคุณ
                  </p>
                )}
                <Field>
                  <Button type="submit" className="w-full">
                    ส่งคำขอรีเซ็ตรหัสผ่าน
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

