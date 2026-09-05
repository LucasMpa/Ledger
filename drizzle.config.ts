import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so load .env.local explicitly.
config({ path: ".env.local" });

// `db:generate` is offline and never connects, so a placeholder is fine there.
// `db:migrate` / `db:push` need a real URL and will fail loudly without one.
const url =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: { url },
  // Only manage the `public` schema — `auth` (users) is owned by Supabase.
  schemaFilter: ["public"],
  // Treat Supabase's built-in roles (authenticated, anon, ...) as external.
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
