import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

// Reuse the connection across dev HMR reloads to avoid exhausting Postgres.
const globalForDb = globalThis as unknown as {
  __ledgerSql?: ReturnType<typeof postgres>;
};

// `prepare: false` keeps this compatible with Supabase's transaction pooler.
const queryClient =
  globalForDb.__ledgerSql ?? postgres(env.DATABASE_URL, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ledgerSql = queryClient;
}

export const db = drizzle(queryClient, { schema });
