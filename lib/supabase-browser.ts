import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthConfig = {
  configured: boolean;
  url?: string;
  anonKey?: string;
  siteUrl?: string;
};

let authConfigPromise: Promise<AuthConfig | null> | null = null;
let browserClientPromise: Promise<SupabaseClient | null> | null = null;

function getAuthConfig() {
  if (!authConfigPromise) {
    authConfigPromise = fetch("/api/auth-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as AuthConfig;
      })
      .catch(() => null);
  }

  return authConfigPromise;
}

export function getSupabaseBrowserClient() {
  if (!browserClientPromise) {
    browserClientPromise = getAuthConfig()
      .then((config) => {
        if (!config?.configured || !config.url || !config.anonKey) return null;

        return createBrowserClient(config.url, config.anonKey, {
          auth: {
            flowType: "pkce",
          },
        });
      })
      .catch(() => null);
  }

  return browserClientPromise;
}

export async function getSupabaseAuthRedirectUrl() {
  const config = await getAuthConfig();
  const origin = config?.siteUrl || window.location.origin;
  return new URL("/auth/callback?next=/", origin).toString();
}
