import { NextResponse } from "next/server";
import { requestOtp } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";

/**
 * POST /api/auth/v2/otp/request
 * Send a 6-digit OTP to the given email address
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Email is required" },
                { status: 400 }
            );
        }

        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Invalid email format" },
                { status: 400 }
            );
        }

        const result = await requestOtp(email.toLowerCase().trim());

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }
        console.error("[OTP Request] Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
