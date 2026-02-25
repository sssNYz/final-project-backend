import { NextResponse } from "next/server";
import { verifyOtpWithPassword } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";

/**
 * POST /api/auth/v2/register/merge
 * Verifies OTP and sets password for a Google account to merge with Email provider.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, otp, newPassword } = body;

        // Validate
        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { error: "email, otp, and newPassword are required" },
                { status: 400 }
            );
        }

        const result = await verifyOtpWithPassword(email, otp, newPassword);

        // Create response with JSON body
        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error("Error in V2 register merge:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
