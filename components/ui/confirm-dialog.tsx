"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Style the confirm button as a destructive action. */
  destructive?: boolean;
  /** Disable both buttons while the action runs. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal confirmation built on the native `<dialog>` element — focus trap, Esc
 * to cancel, and `::backdrop` come for free. The dialog is always mounted;
 * `open` drives `showModal()` / `close()`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-surface p-0 text-foreground shadow-lg backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <div className="text-sm text-muted">{description}</div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={pending}
            autoFocus
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
