"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { adjustStockAction } from "@/app/admin/stock/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Notice } from "@/components/admin/notice";
import { CloseIcon, PencilIcon } from "@/components/ui/icons";
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
    <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 rounded-field border border-[var(--admin-border)] bg-[var(--admin-raised)] p-4 sm:grid-cols-2">
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
      {error ? <div className="sm:col-span-2"><Notice tone="bad" role="alert">{error}</Notice></div> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">{pending ? "Saving" : "Apply change"}</button>
      </div>
    </form>
  );
}

type Filter = "all" | "low" | "out";

export function StockTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const stateOf = (r: Row): Filter =>
    r.quantity === 0 ? "out" : r.quantity <= LOW_STOCK_THRESHOLD ? "low" : "all";
  const counts = {
    all: rows.length,
    low: rows.filter((r) => stateOf(r) === "low").length,
    out: rows.filter((r) => stateOf(r) === "out").length,
  };
  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) => (filter === "all" || stateOf(r) === filter) && (!q || r.name.toLowerCase().includes(q) || r.slug.includes(q)),
  );

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "low", label: "Low stock" },
    { id: "out", label: "Sold out" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="admin-tabs min-w-0 flex-1 border-b-0" role="group" aria-label="Stock filter">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className="admin-tab"
              aria-current={filter === t.id ? "page" : undefined}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
              <span className="admin-tab-count">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="stock-search" className="sr-only">Search products</label>
          <input
            id="stock-search"
            type="search"
            className="field"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {message ? <Notice tone="ok" role="status">{message}</Notice> : null}

      {visible.length === 0 ? (
        <p className="admin-card px-4 py-10 text-center text-body text-muted">No products match.</p>
      ) : (
        <ul className="admin-card divide-y divide-[var(--admin-border)]">
          {visible.map((r) => {
            const state = stateOf(r);
            return (
              <li key={r.productId} className="px-4 py-4 sm:px-5">
                <div className="grid items-center gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_8rem_auto]">
                  <div className="min-w-0 text-body">
                    <Link href={`/admin/products/${r.productId}`} className="font-semibold hover:underline">{r.name}</Link>
                    {r.archived ? <span className="ml-2"><StatusBadge>Archived</StatusBadge></span> : null}
                  </div>
                  <p className="text-body tabular-nums sm:text-right">
                    <span className="mr-2 text-caption uppercase text-muted sm:hidden">Available</span>
                    {r.quantity}
                  </p>
                  <p className="text-body tabular-nums text-muted sm:text-right">
                    <span className="mr-2 text-caption uppercase sm:hidden">Held</span>
                    {r.held}
                  </p>
                  <div>
                    {state === "out" ? (
                      <StatusBadge tone="bad">Sold out</StatusBadge>
                    ) : state === "low" ? (
                      <StatusBadge tone="warn">Low stock</StatusBadge>
                    ) : (
                      <StatusBadge tone="ok">In stock</StatusBadge>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-expanded={open === r.productId}
                    onClick={() => { setOpen(open === r.productId ? null : r.productId); setMessage(null); }}
                    className="admin-action justify-self-start sm:justify-self-end"
                  >
                    {open === r.productId ? (
                      <>
                        <CloseIcon />
                        <span>Close<span className="sr-only"> {r.name}</span></span>
                      </>
                    ) : (
                      <>
                        <PencilIcon />
                        <span>Adjust<span className="sr-only"> {r.name}</span></span>
                      </>
                    )}
                  </button>
                </div>
                {open === r.productId ? (
                  <AdjustForm
                    row={r}
                    onDone={(note) => { setOpen(null); setMessage(note); router.refresh(); }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
