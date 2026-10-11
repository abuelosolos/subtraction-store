"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { recheckPaymentAction, updateFulfilmentAction } from "@/app/admin/orders/actions";
import { Notice } from "@/components/admin/notice";
import { FULFILMENT_STEPS, fulfilmentLabel } from "@/lib/order-labels";

type Status = { kind: "ok" | "error"; text: string } | null;

const messageFor = (reason: string) =>
  reason === "forbidden"
    ? "You don't have permission to do that."
    : reason === "not_allowed"
      ? "That order can't be changed in its current state."
      : reason === "not_found"
        ? "Order not found."
        : "Something went wrong. Please try again.";

export function FulfilmentForm({
  orderId,
  status,
  trackingCarrier,
  trackingNumber,
  notes,
}: {
  orderId: string;
  status: string;
  trackingCarrier: string;
  trackingNumber: string;
  notes: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Status>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setResult(null);
    setErrors({});
    try {
      const r = await updateFulfilmentAction({
        orderId,
        status: String(form.get("status") ?? ""),
        trackingCarrier: String(form.get("trackingCarrier") ?? ""),
        trackingNumber: String(form.get("trackingNumber") ?? ""),
        notes: String(form.get("notes") ?? ""),
      });
      if (r.ok) {
        setResult({ kind: "ok", text: "Fulfilment updated." });
        router.refresh();
      } else if (r.reason === "validation") {
        setErrors(r.fieldErrors);
        setResult({ kind: "error", text: "Check the highlighted fields." });
      } else {
        setResult({ kind: "error", text: messageFor(r.reason) });
      }
    } catch {
      setResult({ kind: "error", text: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const fieldError = (name: string) =>
    errors[name] ? <p id={`${name}-error`} role="alert" className="mt-1 text-caption font-semibold text-[var(--admin-bad)]">{errors[name]}</p> : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="status" className="field-label">Fulfilment status</label>
        <select id="status" name="status" className="field" defaultValue={status}>
          {FULFILMENT_STEPS.map((s) => (
            <option key={s} value={s}>{fulfilmentLabel[s]}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="trackingCarrier" className="field-label">Carrier</label>
          <input id="trackingCarrier" name="trackingCarrier" className="field" defaultValue={trackingCarrier} maxLength={60} aria-invalid={errors.trackingCarrier ? true : undefined} />
          {fieldError("trackingCarrier")}
        </div>
        <div>
          <label htmlFor="trackingNumber" className="field-label">Tracking number</label>
          <input id="trackingNumber" name="trackingNumber" className="field" defaultValue={trackingNumber} maxLength={100} aria-invalid={errors.trackingNumber ? true : undefined} />
          {fieldError("trackingNumber")}
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="field-label">Internal notes</label>
        <textarea id="notes" name="notes" className="field" defaultValue={notes} maxLength={2000} aria-invalid={errors.notes ? true : undefined} />
        <p className="mt-1 text-caption text-subtle">Only staff see this.</p>
        {fieldError("notes")}
      </div>
      {result ? (
        <Notice tone={result.kind === "ok" ? "ok" : "bad"} role={result.kind === "error" ? "alert" : "status"}>
          {result.text}
        </Notice>
      ) : null}
      <div>
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">
          {pending ? "Saving" : "Save fulfilment"}
        </button>
      </div>
    </form>
  );
}

export function RecheckPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Status>(null);

  async function onClick() {
    setPending(true);
    setResult(null);
    try {
      const r = await recheckPaymentAction({ orderId });
      if (r.ok) {
        setResult({ kind: "ok", text: r.note ?? "Checked." });
        router.refresh();
      } else {
        setResult({ kind: "error", text: r.reason === "validation" ? "Invalid request." : messageFor(r.reason) });
      }
    } catch {
      setResult({ kind: "error", text: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button type="button" onClick={onClick} disabled={pending} className="btn btn-outline btn-lg">
          {pending ? "Checking with Paystack" : "Re-check payment with Paystack"}
        </button>
      </div>
      {result ? (
        <Notice tone={result.kind === "ok" ? "ok" : "bad"} role={result.kind === "error" ? "alert" : "status"}>
          {result.text}
        </Notice>
      ) : null}
    </div>
  );
}
