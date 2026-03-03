import { NextResponse } from "next/server";
import { verifyOtp } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";
import { setAuthCookies } from "@/lib/cookies";
import { verifyAccessToken, extractBearerToken } from "@/lib/jwt";

/**
 * POST /api/auth/v2/otp/verify
 * Verify the OTP code and return JWT tokens
 * If user doesn't exist, auto-registers them
 * Also sets HttpOnly cookies for web clients
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

        // Create response with JSON body
        const response = NextResponse.json(result, { status: 200 });

        // Try to read the current user's token from the request
        const existingToken = extractBearerToken(request);
        let preventCookieOverride = false;

        if (existingToken) {
            try {
                const payload = verifyAccessToken(existingToken);
                // If the person making the request is ALREADY an Admin, don't override their cookies
                if (payload.role === "Admin" || payload.role === "SuperAdmin") {
                    preventCookieOverride = true;
                }
            } catch (e) {
                // Token invalid/expired, ignore
            }
        }

        // Set HttpOnly cookies if tokens are present (login-like flow) and it's NOT an existing Admin
        if (result.accessToken && !preventCookieOverride) {
            setAuthCookies(response, {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        }

        return response;
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
