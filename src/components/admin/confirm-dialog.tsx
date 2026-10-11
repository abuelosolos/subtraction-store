"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native modal <dialog> for destructive steps. States the consequence, keeps
 * focus inside, and Escape cancels. The caller owns `open` and the action.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      aria-labelledby="confirm-title"
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <h2 id="confirm-title" className="text-body font-semibold">{title}</h2>
      <div className="mt-2 text-body text-muted">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="btn btn-inverse"
          data-danger={danger || undefined}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Working" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
