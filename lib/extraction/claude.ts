import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { env } from "@/lib/env";
import { merchantSlug } from "@/lib/slug";
import { getPrompt } from "@/lib/extraction/prompt";
import { llmExtractionSchema } from "@/lib/extraction/schema";
import type { ExtractionResult } from "@/lib/extraction/types";

/** Everything the model + server produce, minus the DB-assigned `logId`. */
export type ExtractionCore = Omit<ExtractionResult, "logId">;

export interface ReceiptImage {
  /** base64 of the compressed image, NO `data:` prefix. */
  data: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ExtractionSuccess {
  result: ExtractionCore;
  /** Model output only (no image) — goes to `extraction_logs.raw_llm_json`. */
  rawJson: unknown;
}

interface FailureContext {
  model: string;
  promptVersion: string;
  latencyMs: number;
}

/** Model returned 200 but the output failed schema validation, or it refused. */
export class ExtractionParseError extends Error {
  readonly code = "extraction_failed" as const;
  readonly rawJson: unknown;
  readonly model: string;
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly confidence: number | null;

  constructor(
    message: string,
    ctx: FailureContext & { rawJson: unknown; confidence?: number | null },
  ) {
    super(message);
    this.name = "ExtractionParseError";
    this.rawJson = ctx.rawJson;
    this.model = ctx.model;
    this.promptVersion = ctx.promptVersion;
    this.latencyMs = ctx.latencyMs;
    this.confidence = ctx.confidence ?? null;
  }
}

/** The Anthropic call itself errored or timed out. */
export class ExtractionUnavailableError extends Error {
  readonly code = "llm_unavailable" as const;
  readonly model: string;
  readonly promptVersion: string;
  readonly latencyMs: number;

  constructor(
    message: string,
    ctx: FailureContext,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ExtractionUnavailableError";
    this.model = ctx.model;
    this.promptVersion = ctx.promptVersion;
    this.latencyMs = ctx.latencyMs;
  }
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  cachedClient ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cachedClient;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function joinText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Sends the receipt image to Claude (vision) and returns the validated,
 * structured expense plus the raw model output for logging. The image lives only
 * in memory for this call.
 *
 * @throws {ExtractionParseError} schema-validation failure or refusal (=> 422)
 * @throws {ExtractionUnavailableError} the Anthropic call errored (=> 502)
 */
export async function extractReceipt(
  image: ReceiptImage,
): Promise<ExtractionSuccess> {
  const model = env.EXTRACTION_MODEL;
  const promptVersion = env.PROMPT_VERSION;
  const { system } = getPrompt(promptVersion);

  const startedAt = Date.now();
  let message;
  try {
    message = await getClient().messages.parse({
      model,
      max_tokens: 1024,
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mimeType,
                data: image.data,
              },
            },
            { type: "text", text: "Extract the expense from this receipt." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(llmExtractionSchema) },
    });
  } catch (err) {
    throw new ExtractionUnavailableError(
      "The extraction model is temporarily unavailable.",
      { model, promptVersion, latencyMs: Date.now() - startedAt },
      { cause: err },
    );
  }
  const latencyMs = Date.now() - startedAt;

  if (message.stop_reason === "refusal") {
    throw new ExtractionParseError("The model declined to process this receipt.", {
      model,
      promptVersion,
      latencyMs,
      rawJson: {
        stop_reason: "refusal",
        stop_details: message.stop_details ?? null,
      },
    });
  }

  const parsed = message.parsed_output;
  if (!parsed) {
    throw new ExtractionParseError(
      "The model output did not match the expected schema.",
      {
        model,
        promptVersion,
        latencyMs,
        rawJson: { text: joinText(message.content) },
      },
    );
  }

  const confidence = clamp01(parsed.confidence);
  const result: ExtractionCore = {
    merchant: parsed.merchant,
    merchantKey: merchantSlug(parsed.merchant),
    amountCents: parsed.amount_cents,
    currency: (parsed.currency || "BRL").toUpperCase(),
    date: parsed.date,
    category: parsed.category,
    paymentMethod: parsed.payment_method,
    confidence,
    lowConfidence: confidence < env.CONFIDENCE_THRESHOLD,
    model,
    promptVersion,
    latencyMs,
  };

  return { result, rawJson: parsed };
}
