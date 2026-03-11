import { verifyAccessToken, extractBearerToken } from "@/lib/jwt";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * Middleware helper that requires authentication
 * Returns the JWT Payload if authenticated, or throws an error response
 * 
 * Priority order:
 * 1. Authorization header (Bearer token) — used by mobile (Flutter) clients
 * 2. HttpOnly cookie (accessToken) — used by web clients
 */
export async function requireAuth(request: Request): Promise<JwtPayload> {
  const headerToken = extractBearerToken(request);
  const cookieToken = getAccessTokenFromCookie(request);
  const token = headerToken || cookieToken;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      };
    } catch (e) {
      // V2 token invalid
      console.error("JWT Verification Error:", e);
    }
  }

  throw new Error("Unauthorized");
}






