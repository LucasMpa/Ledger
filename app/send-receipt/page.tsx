"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("sendReceipt");
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
          : t("genericError"),
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
          : t("saveError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("heading")}
        </h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      {phase === "capture" && (
        <Card className="flex flex-col gap-4">
          <label
            htmlFor="receipt"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted hover:border-primary"
          >
            <span className="text-2xl">📸</span>
            <span>{file ? t("chooseDifferent") : t("tapToChoose")}</span>
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
                alt={t("previewAlt")}
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
            {extracting ? t("reading") : t("extract")}
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
          <p className="font-medium text-foreground">{t("saved")}</p>
          <p className="text-sm text-muted">{t("savedHint")}</p>
          <Button onClick={resetToCapture} className="mt-2">
            {t("sendAnother")}
          </Button>
        </Card>
      )}
    </div>
  );
}
