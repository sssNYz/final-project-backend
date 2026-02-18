import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";
import { setAuthCookies, getRefreshTokenFromCookie } from "@/lib/cookies";

/**
 * POST /api/auth/v2/refresh
 * Exchange a valid refresh token for a new access token
 * Also sets HttpOnly cookie for web clients
 */
export async function POST(request: Request) {
    try {
        let refreshToken: string | null = null;

        // Try to get refreshToken from JSON body (mobile clients)
        try {
            const body = await request.json();
            refreshToken = body.refreshToken || null;
        } catch {
            // Body might be empty for cookie-based clients
        }

        // Fallback: read refreshToken from cookie (web clients)
        if (!refreshToken) {
            refreshToken = getRefreshTokenFromCookie(request);
        }

        if (!refreshToken) {
            return NextResponse.json(
                { error: "refreshToken is required" },
                { status: 400 }
            );
        }

        const result = await refreshAccessToken(refreshToken);

        // Create response with JSON body (for mobile/header-based clients)
        const response = NextResponse.json(result, { status: 200 });

        // Set HttpOnly cookie with new access token (for web clients)
        setAuthCookies(response, { accessToken: result.accessToken });

        return response;
    } catch (error: unknown) {
        console.error("Error in V2 refresh:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
