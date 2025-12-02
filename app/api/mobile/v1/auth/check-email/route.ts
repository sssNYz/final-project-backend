import { NextResponse } from "next/server";
import { ServiceError } from "@/server/common/errors";
import { checkEmailStatus } from "@/server/auth/auth.service";

/**
 * POST /api/mobile/v1/auth/check-email
 * Check if an email already exists in the database
 * This is used before Google OAuth to ask user for merge confirmation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    const status = await checkEmailStatus(email);
    return NextResponse.json({ status });
  } catch (error: unknown) {
    console.error("Error checking email:", error);

    if (error instanceof ServiceError) {
      return NextResponse.json(error.body, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



