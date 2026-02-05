
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("example.supabase.co") || key.includes("changeme")) {
    console.warn("Supabase credentials missing or placeholders. Using mock client.");
    // Return a mock client that satisfies the basic interface used in lib/auth.ts
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase configuration missing") }),
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase configuration missing") }),
      }
    } as any;
  }

  try {
    return createBrowserClient(url, key)
  } catch (error) {
    console.warn("Failed to initialize Supabase client:", error);
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase init failed") }),
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase init failed") }),
      }
    } as any;
  }
}