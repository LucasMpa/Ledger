"use client";

import * as React from "react";

import { ReceiptForm, type ReceiptFormValues } from "@/components/receipt-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ApiError,
  createTransaction,
  extractReceipt,
} from "@/lib/api-client";
import type { ExtractionResult } from "@/lib/extraction";

type Phase = "capture" | "review" | "done";

export default function SendReceiptPage() {
  const [phase, setPhase] = React.useState<Phase>("capture");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [extractError, setExtractError] = React.useState<string | null>(null);
  const [extraction, setExtraction] = React.useState<ExtractionResult | null>(
    null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetToCapture() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhase("capture");
    setFile(null);
    setPreviewUrl(null);
    setExtracting(false);
    setExtractError(null);
    setExtraction(null);
    setSubmitting(false);
    setSubmitError(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setExtractError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await extractReceipt(file);
      setExtraction(result);
      setPhase("review");
    } catch (err) {
      setExtractError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleConfirm(values: ReceiptFormValues) {
    if (!extraction) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTransaction({
        ...values,
        source: "photo",
        confidence: extraction.confidence,
      });
      setPhase("done");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Could not save the transaction. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Send Receipt</h1>
        <p className="text-sm text-muted">
          Snap or pick a photo of the receipt — the rest is filled in for you.
        </p>
      </div>

      {phase === "capture" && (
        <Card className="flex flex-col gap-4">
          <label
            htmlFor="receipt"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted hover:border-primary"
          >
            <span className="text-2xl">📸</span>
            <span>
              {file ? "Choose a different photo" : "Tap to take or choose a photo"}
            </span>
            <input
              id="receipt"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {previewUrl && (
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-80 w-full object-contain"
              />
            </div>
          )}

          {extractError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {extractError}
            </p>
          )}

          <Button onClick={handleExtract} disabled={!file || extracting}>
            {extracting ? "Reading receipt…" : "Extract"}
          </Button>
        </Card>
      )}

      {phase === "review" && extraction && (
        <Card>
          <ReceiptForm
            initial={extraction}
            onConfirm={handleConfirm}
            onDiscard={resetToCapture}
            submitting={submitting}
            error={submitError}
          />
        </Card>
      )}

      {phase === "done" && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="text-3xl">✅</span>
          <p className="font-medium text-foreground">Transaction saved</p>
          <p className="text-sm text-muted">
            It&apos;s now in your dashboard and this month&apos;s totals.
          </p>
          <Button onClick={resetToCapture} className="mt-2">
            Send another
          </Button>
        </Card>
      )}
    </div>
  );
}
