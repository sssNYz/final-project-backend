import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/v1/verifyOtp
// ตรวจสอบรหัส OTP ที่ส่งไปทาง email กับ Supabase
export async function POST(req: Request) {
  const supabase = await createClient();

  const { email, token } = await req.json();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data });
}
