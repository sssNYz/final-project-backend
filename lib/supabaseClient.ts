
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function createSafeClient() {
  // Check if credentials are missing, empty, or placeholder values
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("example.supabase.co") ||
    supabaseKey.includes("changeme") ||
    supabaseUrl.trim() === "" ||
    supabaseKey.trim() === ""
  ) {
    console.warn("Supabase credentials missing or placeholders (legacy client). Using mock.");
    return {
      auth: {
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase auth missing") }),
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase auth missing") }),
      }
    } as any;
  }

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn("Supabase init failed", e);
    return {
      auth: {
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase auth failed") })
      }
    } as any;
  }
}

export const supabase = createSafeClient();
