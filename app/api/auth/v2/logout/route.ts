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
        console.log("== ROUTE LOGOUT DEBUG ==");
        
        let refreshToken: string | null = null;

        // Try to get refreshToken from JSON body (mobile clients)
        try {
            const contentLength = request.headers.get("content-length");
            const contentType = request.headers.get("content-type");
            console.log("Content-Length:", contentLength);
            console.log("Content-Type:", contentType);
            
            if (contentLength && parseInt(contentLength) > 0) {
                const body = await request.json();
                console.log("Parsed Body Keys:", Object.keys(body));
                refreshToken = body.refreshToken || null;
            }
        } catch (e: any) {
            console.log("Failed to parse body JSON:", e.message);
        }

        // Fallback: read refreshToken from cookie (web clients)
        if (!refreshToken) {
            refreshToken = getRefreshTokenFromCookie(request);
            console.log("Falling back to cookie... Found?", !!refreshToken);
        }

        if (!refreshToken) {
            console.log("ABORTING: No refresh token found in request headers/body/cookies!");
            // Even if no refresh token, still clear cookies
            const response = NextResponse.json(
                { error: "refreshToken is required" },
                { status: 400 }
            );
            clearAuthCookies(response);
            return response;
        }

        console.log("Token successfully extracted. Calling logoutUser()...");
        const result = await logoutUser(refreshToken);

        // Create response and clear cookies
        const response = NextResponse.json(result, { status: 200 });
        clearAuthCookies(response);
        
        console.log("Logout successful. Sending 200 response.");
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
