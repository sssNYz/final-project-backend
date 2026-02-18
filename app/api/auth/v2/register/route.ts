import { NextResponse } from "next/server";
import { registerUser } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";

/**
 * POST /api/auth/v2/register
 * Register a new user with email and password.
 * This triggers an OTP email (does NOT return tokens).
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Email is required" },
                { status: 400 }
            );
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const result = await registerUser({ email: email.toLowerCase().trim(), password });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }
        console.error("[Register] Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
