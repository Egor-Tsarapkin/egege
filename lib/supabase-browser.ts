import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthConfig = {
  configured: boolean;
  url?: string;
  anonKey?: string;
};

let browserClientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClientPromise) {
    browserClientPromise = fetch("/api/auth-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const config = (await response.json()) as AuthConfig;
        if (!config.configured || !config.url || !config.anonKey) return null;

        return createClient(config.url, config.anonKey, {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
            flowType: "implicit",
          },
        });
      })
      .catch(() => null);
  }

  return browserClientPromise;
}
