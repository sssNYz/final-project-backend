import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/v1/signup
// ลงทะเบียนผู้ใช้ใหม่บน Supabase (ยังไม่ได้ผูกกับ Prisma/Role แอดมิน)
export async function POST(req: Request) {
  const supabase = await createClient();

  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
