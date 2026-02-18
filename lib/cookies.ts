import { NextResponse } from "next/server";

// ============ Cookie Configuration ============
const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";

// 15 minutes for access token (matches JWT expiry in jwt.ts)
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
// 7 days for refresh token (matches refresh token expiry in jwt.ts)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Set auth cookies (HttpOnly) on a NextResponse.
 * Used by login, refresh, and OTP verify endpoints.
 *
 * - `SameSite=None` + `Secure` allows cross-site usage
 *   (e.g., http://localhost:3000 frontend → https://medi-buddy.xyz backend)
 * - `HttpOnly` prevents JavaScript from reading the cookie (XSS protection)
 * - `Path=/` makes the cookie available to all API routes
 */
export function setAuthCookies(
    response: NextResponse,
    tokens: { accessToken: string; refreshToken?: string }
): NextResponse {
    // Always set access token cookie
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    // Set refresh token cookie if provided
    if (tokens.refreshToken) {
        response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
            maxAge: REFRESH_TOKEN_MAX_AGE,
        });
    }

    return response;
}

/**
 * Clear auth cookies on a NextResponse.
 * Used by the logout endpoint.
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
    response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 0,
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 0,
    });

    return response;
}

/**
 * Extract access token from cookies on an incoming Request.
 * Returns null if no cookie is found.
 */
export function getAccessTokenFromCookie(request: Request): string | null {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) =>
        c.startsWith(`${ACCESS_TOKEN_COOKIE}=`)
    );
    if (!tokenCookie) return null;

    return tokenCookie.split("=")[1] || null;
}

/**
 * Extract refresh token from cookies on an incoming Request.
 * Returns null if no cookie is found.
 */
export function getRefreshTokenFromCookie(request: Request): string | null {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) =>
        c.startsWith(`${REFRESH_TOKEN_COOKIE}=`)
    );
    if (!tokenCookie) return null;

    return tokenCookie.split("=")[1] || null;
}
