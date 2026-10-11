"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { adjustStockAction } from "@/app/admin/stock/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalog";

type Row = { productId: number; name: string; slug: string; quantity: number; held: number; archived: boolean };

const REASONS = [
  ["restock", "Restock (new units arrived)"],
  ["correction", "Correction (stock count)"],
  ["damaged", "Damaged or lost"],
  ["returned", "Customer return"],
  ["other", "Other"],
] as const;

const MESSAGES: Record<string, string> = {
  forbidden: "You don't have permission to do that.",
  not_found: "That product has no stock record.",
  would_go_negative: "That would take stock below zero. Nothing was changed.",
  stale: "Stock changed since you loaded this page (a customer may have just bought). Reload and try again.",
  no_change: "That's the quantity it already has.",
  failed: "Something went wrong. Please try again.",
};

function AdjustForm({ row, onDone }: { row: Row; onDone: (note: string) => void }) {
  const [mode, setMode] = useState<"add" | "set">("add");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const r = await adjustStockAction({
        productId: row.productId,
        mode,
        amount: String(f.get("amount") ?? ""),
        expected: mode === "set" ? row.quantity : undefined,
        reason: String(f.get("reason") ?? ""),
        note: String(f.get("note") ?? ""),
      });
      if (r.ok) onDone(`${row.name}: now ${r.quantityAfter} available (${r.delta > 0 ? "+" : ""}${r.delta}).`);
      else if (r.reason === "validation") setError(Object.values(r.fieldErrors)[0] ?? "Check the fields.");
      else setError(MESSAGES[r.reason] ?? MESSAGES.failed);
    } catch {
      setError(MESSAGES.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 border border-line/30 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`mode-${row.productId}`} className="field-label">Change</label>
        <select id={`mode-${row.productId}`} className="field" value={mode} onChange={(e) => setMode(e.target.value as "add" | "set")}>
          <option value="add">Add or remove units</option>
          <option value="set">Set exact quantity</option>
        </select>
      </div>
      <div>
        <label htmlFor={`amount-${row.productId}`} className="field-label">
          {mode === "add" ? "Units (negative to remove)" : "New quantity"}
        </label>
        <input id={`amount-${row.productId}`} name="amount" type="number" inputMode="numeric" className="field" required />
      </div>
      <div>
        <label htmlFor={`reason-${row.productId}`} className="field-label">Reason</label>
        <select id={`reason-${row.productId}`} name="reason" className="field" defaultValue="restock">
          {REASONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
      </div>
      <div>
        <label htmlFor={`note-${row.productId}`} className="field-label">Note (optional)</label>
        <input id={`note-${row.productId}`} name="note" className="field" maxLength={300} />
      </div>
      {row.held > 0 ? (
        <p className="text-caption text-muted sm:col-span-2">
          {row.held} units are held by unpaid orders. If those customers pay late and stock has run out, the order goes to review.
        </p>
      ) : null}
      <p role={error ? "alert" : "status"} className="min-h-[1.5em] text-body font-semibold sm:col-span-2">{error}</p>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">{pending ? "Saving" : "Apply change"}</button>
      </div>
    </form>
  );
}

export function StockTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="min-h-[1.5em] text-body font-semibold">{message}</p>
      <ul className="flex flex-col divide-y divide-line/30 border-y border-line/30">
        {rows.map((r) => (
          <li key={r.productId} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-body">
                <Link href={`/admin/products/${r.productId}`} className="font-semibold underline underline-offset-4">{r.name}</Link>
                {r.archived ? <span className="ml-2"><StatusBadge>Archived</StatusBadge></span> : null}
                <p className="text-muted">
                  {r.quantity} available{r.held > 0 ? ` · ${r.held} held` : ""}
                  {r.quantity === 0 ? " · sold out" : r.quantity <= LOW_STOCK_THRESHOLD ? " · low" : ""}
                </p>
              </div>
              <button
                type="button"
                aria-expanded={open === r.productId}
                onClick={() => { setOpen(open === r.productId ? null : r.productId); setMessage(null); }}
                className="text-caption underline underline-offset-4"
              >
                {open === r.productId ? "Close" : "Adjust"}<span className="sr-only"> {r.name}</span>
              </button>
            </div>
            {open === r.productId ? (
              <AdjustForm
                row={r}
                onDone={(note) => { setOpen(null); setMessage(note); router.refresh(); }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
