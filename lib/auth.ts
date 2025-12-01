import { supabase } from "./supabaseClient";
import { User } from "@supabase/supabase-js";

/**
 * Gets the Supabase user from the Authorization header token
 * @param request - The Next.js request object
 * @returns The Supabase user or null if invalid
 */
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
 */
export async function requireAuth(request: Request): Promise<User> {
  const user = await getSupabaseUser(request);
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}






