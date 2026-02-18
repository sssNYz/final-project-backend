import { NextResponse } from "next/server";
import { verifyOtp } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";

/**
 * POST /api/auth/v2/otp/verify
 * Verify the OTP code and return JWT tokens
 * If user doesn't exist, auto-registers them
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, code } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Email is required" },
                { status: 400 }
            );
        }

        if (!code || typeof code !== "string" || code.length !== 6) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "A 6-digit code is required" },
                { status: 400 }
            );
        }

        const result = await verifyOtp(email.toLowerCase().trim(), code);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }
        console.error("[OTP Verify] Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
