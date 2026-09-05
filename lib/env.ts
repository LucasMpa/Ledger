import { z } from "zod";

/**
 * Zod-validated environment. At runtime, importing this module fails fast
 * (throws) when a required variable is missing or invalid. Every server module
 * and route reads from `env`, never `process.env` directly.
 *
 * Exception: during `next build` (`NEXT_PHASE === "phase-production-build"`) or
 * when `SKIP_ENV_VALIDATION` is set, validation is skipped and `env` falls back
 * to a permissive view of `process.env` so route modules can be statically
 * analysed without real secrets. Route handlers execute at request time, outside
 * the build phase, where the throw above still applies.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  EXTRACTION_MODEL: z.string().min(1).default("claude-sonnet-5"),
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  PROMPT_VERSION: z.string().min(1).default("v1"),
});

const parsed = envSchema.safeParse(process.env);

const skipValidation =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1" ||
  process.env.SKIP_ENV_VALIDATION === "true";

if (!parsed.success && !skipValidation) {
  throw new Error(
    `Invalid environment variables:\n${JSON.stringify(
      z.flattenError(parsed.error).fieldErrors,
      null,
      2,
    )}`,
  );
}

export type Env = z.infer<typeof envSchema>;

/**
 * The validated environment at runtime. During the build phase (or with
 * `SKIP_ENV_VALIDATION`) with invalid env, this is a permissive `process.env`
 * view — never reached by executing request code.
 */
export const env: Env = parsed.success
  ? parsed.data
  : (process.env as unknown as Env);
