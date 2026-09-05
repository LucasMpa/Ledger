import { createClient } from "@/lib/supabase/server";

/** Thrown by {@link requireUser} when there is no valid Supabase session. */
export class UnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/** Returns the signed-in user's id, or `null` when there is no session. */
export async function getUser(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { id: user.id };
}

/**
 * Returns `{ id }` for the signed-in user. Route handlers catch
 * {@link UnauthenticatedError} and turn it into a 401 `unauthenticated`.
 */
export async function requireUser(): Promise<{ id: string }> {
  const user = await getUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}
