import { createClient } from "./supabase/client";
import { User } from "@supabase/supabase-js";
import { verifyAccessToken, extractBearerToken } from "@/lib/jwt";
import { getAccessTokenFromCookie } from "@/lib/cookies";

/**
 * Gets the Supabase user from the Authorization header token
 * @param request - The Next.js request object
 * @returns The Supabase user or null if invalid
 */

const supabase = createClient();
export async function getSupabaseUser(request: Request): Promise<User | null> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");

    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("Error verifying Supabase token:", error);
    return null;
  }
}

/**
 * Middleware helper that requires authentication
 * Returns the user if authenticated, or throws an error response
 * 
 * Priority order:
 * 1. Authorization header (Bearer token) — used by mobile (Flutter) clients
 * 2. HttpOnly cookie (accessToken) — used by web clients
 * 3. Supabase token (legacy) — checked via header
 */
export async function requireAuth(request: Request): Promise<User> {
  const user = await getSupabaseUser(request);

  if (user) {
    return user;
  }

  // Try V2 JWT from header first, then from cookie
  const headerToken = extractBearerToken(request);
  const cookieToken = getAccessTokenFromCookie(request);
  const token = headerToken || cookieToken;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      // Return mock Supabase user
      return {
        id: `v2_${payload.userId}`,
        email: payload.email,
        role: "authenticated",
        aud: "authenticated",
        created_at: new Date().toISOString(),
        app_metadata: { provider: "email" },
        user_metadata: {},
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        phone: "",
        identities: [],
        factors: [],
      } as unknown as User;
    } catch (e) {
      // V2 token invalid
    }
  }

  throw new Error("Unauthorized");
}






