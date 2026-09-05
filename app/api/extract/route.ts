import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { extractionLogs } from "@/lib/db/schema";
import {
  extractReceipt,
  ExtractionParseError,
  ExtractionUnavailableError,
} from "@/lib/extraction";
import { fail, ok, zodFail } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Max decoded image size accepted by `/api/extract`. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const bodySchema = z.object({
  image: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/** Approximate decoded byte length of a base64 string (no `data:` prefix). */
function decodedByteLength(base64: string): number {
  const len = base64.length;
  if (len === 0) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

async function writeLog(values: typeof extractionLogs.$inferInsert): Promise<string | null> {
  try {
    const [row] = await db
      .insert(extractionLogs)
      .values(values)
      .returning({ id: extractionLogs.id });
    return row?.id ?? null;
  } catch (err) {
    console.error("failed to write extraction_logs row", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("unauthenticated", "Authentication required.", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return fail("invalid_request", "Body must be valid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) return zodFail(parsed.error);

  if (decodedByteLength(parsed.data.image) > MAX_IMAGE_BYTES) {
    return fail(
      "payload_too_large",
      `Decoded image exceeds ${MAX_IMAGE_BYTES} bytes.`,
      413,
    );
  }

  try {
    const { result, rawJson } = await extractReceipt({
      data: parsed.data.image,
      mimeType: parsed.data.mimeType,
    });

    const logId = await writeLog({
      userId: user.id,
      rawLlmJson: rawJson,
      parsedOk: true,
      errorCode: null,
      model: result.model,
      promptVersion: result.promptVersion,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
    });
    if (!logId) {
      return fail("internal", "Could not record the extraction.", 500);
    }

    return ok({ ...result, logId });
  } catch (err) {
    if (err instanceof ExtractionParseError) {
      await writeLog({
        userId: user.id,
        rawLlmJson: err.rawJson ?? {},
        parsedOk: false,
        errorCode: err.code,
        model: err.model,
        promptVersion: err.promptVersion,
        confidence: err.confidence,
        latencyMs: err.latencyMs,
      });
      return fail(
        "extraction_failed",
        "Could not read structured data from this receipt.",
        422,
      );
    }

    if (err instanceof ExtractionUnavailableError) {
      await writeLog({
        userId: user.id,
        rawLlmJson: { error: err.code },
        parsedOk: false,
        errorCode: err.code,
        model: err.model,
        promptVersion: err.promptVersion,
        confidence: null,
        latencyMs: err.latencyMs,
      });
      return fail(
        "llm_unavailable",
        "The extraction service is temporarily unavailable.",
        502,
      );
    }

    console.error("unexpected /api/extract error", err);
    return fail("internal", "Unexpected error.", 500);
  }
}
