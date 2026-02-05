import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("example.supabase.co") || key.includes("changeme")) {
    console.warn("Supabase credentials missing or placeholders. Using mock server client.");
    // Return a mock client that satisfies the basic interface
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase configuration missing") }),
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase configuration missing") }),
      }
    } as any;
  }

  const cookieStore = await cookies()

  try {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })
  } catch (error) {
    console.warn("Failed to initialize Supabase server client:", error);
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase init failed") }),
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase init failed") }),
      }
    } as any;
  }
}