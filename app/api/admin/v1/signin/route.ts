import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { syncAdminAccount } from "@/server/auth/auth.service";
import type { AuthProvider } from "@/server/auth/auth.service";
import { ServiceError } from "@/server/common/errors";

const EMAIL_PROVIDER: AuthProvider = "email";

// POST /api/admin/v1/signin
// ล็อกอินผู้ดูแลระบบด้วย email + password ผ่าน Supabase
// จากนั้น sync ข้อมูลบัญชีแอดมินเข้า Prisma และคืน accessToken/refreshToken กลับไป
export async function POST(request: Request) {
  try {
    // 1) อ่าน email และ password จาก body
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    // 2) เรียก Supabase เพื่อล็อกอินแบบ email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Invalid email or password" },
        { status: 401 }
      );
    }

    const supabaseUser = data.user;

    // 3) sync บัญชีแอดมินใน Prisma และอัปเดต lastLogin
    const result = await syncAdminAccount({
      supabaseUser,
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email ?? email,
      provider: EMAIL_PROVIDER,
      allowMerge: true,
    });

    // 4) ส่ง token และข้อมูลผู้ใช้กลับให้ frontend
    return NextResponse.json(
      {
        message: "Signin success",
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: result.user,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in /api/admin/signin:", error);

    // กรณี error ที่มาจาก business logic (ServiceError)
    if (error instanceof ServiceError) {
      return NextResponse.json(error.body, { status: error.statusCode });
    }

    // error อื่น ๆ ให้ถือเป็น 500
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
