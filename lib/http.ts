import { z } from "zod";

/**
 * Shared JSON response helpers. Every `/api/*` route returns either a bare
 * success payload via {@link ok} or the error envelope
 * `{ error: { code, message, details? } }` via {@link fail} / {@link zodFail}.
 */

export type ApiErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "not_found"
  | "payload_too_large"
  | "extraction_failed"
  | "llm_unavailable"
  | "internal";

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

/** 400 envelope for a failed Zod parse; `details` is `flatten()` of the error. */
export function zodFail(error: z.ZodError): Response {
  return fail(
    "invalid_request",
    "Request validation failed.",
    400,
    z.flattenError(error),
  );
}
