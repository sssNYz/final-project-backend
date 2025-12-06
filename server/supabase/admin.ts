import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getConfig(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return { url, serviceKey };
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const config = getConfig();

  if (!config) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });

  return cachedClient;
}

export function isSupabaseAdminConfigured(): boolean {
  return getConfig() !== null;
}

export async function deleteSupabaseUser(userId: string) {
  const client = getSupabaseAdminClient();

  if (!client) {
    console.warn(
      "Supabase admin client is not configured. Skipping Supabase user deletion."
    );

    return { data: null, error: null };
  }

  return client.auth.admin.deleteUser(userId);
}
