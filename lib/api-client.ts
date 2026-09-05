import type { ExtractionResult } from "@/lib/extraction/types";
import type {
  TransactionCreateInput,
  TransactionDto,
  TransactionUpdateInput,
} from "@/lib/transactions";

/**
 * Browser-side wrappers around the `/api/*` routes. Every call parses the shared
 * error envelope `{ error: { code, message, details? } }` and throws an
 * {@link ApiError} carrying the stable `code`. These run in the browser only —
 * Server Components must not import this module.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "internal";
  let message = `Request failed (${res.status}).`;
  let details: unknown;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    // non-JSON error body — keep the defaults
  }
  return new ApiError(code, message, res.status, details);
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiError(
      "network_error",
      "Could not reach the server. Check your connection and try again.",
      0,
      cause,
    );
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* extract                                                                    */
/* -------------------------------------------------------------------------- */

const ALLOWED_MIME = new Set(["image/png", "image/webp"]);

function inferMimeType(blob: Blob): "image/jpeg" | "image/png" | "image/webp" {
  return ALLOWED_MIME.has(blob.type)
    ? (blob.type as "image/png" | "image/webp")
    : "image/jpeg";
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected FileReader result."));
        return;
      }
      // strip the `data:*;base64,` prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
    reader.readAsDataURL(blob);
  });
}

export async function extractReceipt(file: File): Promise<ExtractionResult> {
  const { default: imageCompression } = await import(
    "browser-image-compression"
  );
  let compressed: Blob;
  try {
    compressed = await imageCompression(file, {
      maxWidthOrHeight: 1200,
      maxSizeMB: 0.3,
      useWebWorker: true,
    });
  } catch {
    // fall back to the original file if compression fails
    compressed = file;
  }

  const mimeType = inferMimeType(compressed);
  const image = await toBase64(compressed);

  return request<ExtractionResult>("/api/extract", {
    method: "POST",
    body: JSON.stringify({ image, mimeType }),
  });
}

/* -------------------------------------------------------------------------- */
/* transactions                                                               */
/* -------------------------------------------------------------------------- */

export interface ListTransactionsParams {
  from?: string;
  to?: string;
  category?: string; // comma-separated
  source?: "photo" | "manual";
  search?: string;
  limit?: number;
  offset?: number;
  sort?: "occurredOn" | "amountCents" | "createdAt";
  dir?: "asc" | "desc";
}

export interface TransactionListResponse {
  transactions: TransactionDto[];
  total: number;
  limit: number;
  offset: number;
}

export function listTransactions(
  params: ListTransactionsParams = {},
): Promise<TransactionListResponse> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return request<TransactionListResponse>(
    `/api/transactions${query ? `?${query}` : ""}`,
  );
}

export function createTransaction(
  body: TransactionCreateInput,
): Promise<{ transaction: TransactionDto }> {
  return request<{ transaction: TransactionDto }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTransaction(
  id: string,
  body: TransactionUpdateInput,
): Promise<{ transaction: TransactionDto }> {
  return request<{ transaction: TransactionDto }>(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTransaction(
  id: string,
): Promise<{ ok: true; id: string }> {
  return request<{ ok: true; id: string }>(`/api/transactions/${id}`, {
    method: "DELETE",
  });
}
