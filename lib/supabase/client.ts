import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser / Client Components.
 *
 * Reads `NEXT_PUBLIC_*` from `process.env` directly (they are inlined at build
 * time and are public). `lib/env.ts` is intentionally not imported here — it
 * validates server-only secrets and must not reach the browser bundle.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
