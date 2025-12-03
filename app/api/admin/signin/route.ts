import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { syncAdminAccount } from "@/server/auth/auth.service";
import type { AuthProvider } from "@/server/auth/auth.service";
import { ServiceError } from "@/server/common/errors";


const EMAIL_PROVIDER: AuthProvider = "email";

export async function POST(request: Request) {
  try {
    // 1) Read email + password from body
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    // 2) Login with Supabase by password
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

    // 3) Sync admin in Prisma DB and update lastLogin
    const result = await syncAdminAccount({
      supabaseUser,
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email ?? email,
      provider: EMAIL_PROVIDER,
      allowMerge: true,
    });

    // 4) Send tokens + user info back
    return NextResponse.json(
      {
        message: "Signin success",
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: result.user, // this has updated lastLogin
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in /api/admin/signin:", error);

    // known business error
    if (error instanceof ServiceError) {
      return NextResponse.json(error.body, { status: error.statusCode });
    }

    // other error
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}