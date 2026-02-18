import { NextResponse } from "next/server";
import { logoutUser } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";
import { clearAuthCookies, getRefreshTokenFromCookie } from "@/lib/cookies";

/**
 * POST /api/auth/v2/logout
 * Revoke a refresh token (invalidate session)
 * Also clears HttpOnly cookies for web clients
 */
export async function POST(request: Request) {
    try {
        let refreshToken: string | null = null;

        // Try to get refreshToken from JSON body (mobile clients)
        try {
            const contentLength = request.headers.get("content-length");
            if (contentLength && parseInt(contentLength) > 0) {
                const body = await request.json();
                refreshToken = body.refreshToken || null;
            }
        } catch {
            // Ignore JSON parse error
        }

        // Fallback: read refreshToken from cookie (web clients)
        if (!refreshToken) {
            refreshToken = getRefreshTokenFromCookie(request);
        }

        if (!refreshToken) {
            // Even if no refresh token, still clear cookies
            const response = NextResponse.json(
                { error: "refreshToken is required" },
                { status: 400 }
            );
            clearAuthCookies(response);
            return response;
        }

        const result = await logoutUser(refreshToken);

        // Create response and clear cookies
        const response = NextResponse.json(result, { status: 200 });
        clearAuthCookies(response);

        return response;
    } catch (error: unknown) {
        console.error("Error in V2 logout:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
