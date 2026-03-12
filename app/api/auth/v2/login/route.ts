import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";
import { setAuthCookies } from "@/lib/cookies";

/**
 * POST /api/auth/v2/login
 * Authenticate with email + password, returns access + refresh tokens
 * Also sets HttpOnly cookies for web clients
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, timezone } = body;

        // Validate
        if (!email || !password) {
            return NextResponse.json(
                { error: "email and password are required" },
                { status: 400 }
            );
        }

        const result = await loginUser({ email, password, timezone });

        // Create response with JSON body (for mobile/header-based clients)
        const response = NextResponse.json(result, { status: 200 });

        // Set HttpOnly cookies (for web clients)
        setAuthCookies(response, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });

        return response;
    } catch (error: unknown) {
        console.error("Error in V2 login:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
