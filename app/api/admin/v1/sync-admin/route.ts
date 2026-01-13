import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AuthProvider, syncAdminAccount } from "@/server/auth/auth.service";
import { ServiceError } from "@/server/common/errors";

const ALLOWED_PROVIDERS: AuthProvider[] = ["email", "google", "email,google", "both"];

// GET /api/admin/v1/sync-admin
// ให้ข้อมูลวิธีใช้งาน API sync-admin (สำหรับอ้างอิง / ทดลองผ่าน Postman)
export async function GET() {
  return NextResponse.json(
    {
      message: "API Usage Information",
      endpoint: "/api/admin/sync-admin",
      method: "POST",
      description: "Sync or create ADMIN user in Prisma database after Supabase authentication",
      requiredHeaders: {
        Authorization: "Bearer <supabase_access_token>",
        "Content-Type": "application/json",
      },
      requiredBody: {
        supabaseUserId: "string (required) - Supabase user ID",
        email: "string (required) - User email address",
        provider: "string (required) - one of: 'email', 'google', 'email,google' (legacy 'both' also accepted)",
        allowMerge: "boolean (optional) - Legacy flag (accepted but no longer required)",
      },
      exampleRequest: {
        method: "POST",
        headers: {
          Authorization: "Bearer your_supabase_access_token",
          "Content-Type": "application/json",
        },
        body: {
          supabaseUserId: "user-id-from-supabase",
          email: "admin@example.com",
          provider: "email",
          allowMerge: false,
        },
      },
      possibleResponses: {
        "201": "Admin user created successfully",
        "200": "Admin user updated or merged successfully",
        "400": "Missing required fields or invalid provider value",
        "401": "Unauthorized - Invalid or missing token",
        "403": "Token does not match provided user data",
        "500": "Internal server error",
      },
    },
    { status: 200 }
  );
}

// POST /api/admin/v1/sync-admin
// ใช้ sync หรือสร้างบัญชีแอดมินใน Prisma หลังจาก auth กับ Supabase แล้ว
// ตรวจสอบว่า token ใน header ตรงกับข้อมูลที่ส่งมาใน body ด้วย
export async function POST(request: Request) {
  try {
    // 1) ตรวจสอบ Supabase token จาก header
    const supabaseUser = await requireAuth(request);

    // 2) อ่าน body
    const body = await request.json();
    const { supabaseUserId, email, provider, allowMerge } = body;

    // 3) ตรวจสอบค่าที่จำเป็น
    if (!supabaseUserId || !email || !provider) {
      return NextResponse.json(
        { error: "supabaseUserId, email, and provider are required" },
        { status: 400 }
      );
    }

    // 4) ตรวจสอบว่า provider อยู่ในชุดที่อนุญาต
    if (!ALLOWED_PROVIDERS.includes(provider as AuthProvider)) {
      return NextResponse.json(
        { error: "provider must be 'email', 'google', or 'email,google' (legacy 'both' also accepted)" },
        { status: 400 }
      );
    }

    const providerValue = provider as AuthProvider;

    // 5) call service → this will also set bigger role (Admin / SuperAdmin)
    const result = await syncAdminAccount({
      supabaseUser,
      supabaseUserId,
      email,
      provider: providerValue,
      allowMerge,
    });

    // 6) send response
    return NextResponse.json(
      {
        message: result.message,
        user: result.user,
      },
      { status: result.statusCode }
    );
  } catch (error: unknown) {
    console.error("Error syncing admin:", error);

    // 401 Unauthorized (token wrong / missing)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        {
          error: "Unauthorized - Invalid or missing token",
          message:
            "Please include a valid Authorization header with your Supabase access token",
          help: "Add header: Authorization: Bearer <your_supabase_access_token>",
          example: {
            headers: {
              Authorization: "Bearer your_supabase_access_token_here",
            },
          },
        },
        { status: 401 }
      );
    }

    // known business error from ServiceError
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
