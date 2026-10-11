"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/app/account/addresses/actions";
import { AddressForm } from "@/components/account/address-form";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import type { SavedAddress } from "@/lib/addresses";

type Country = { code: string; name: string };

export function AddressBook({
  addresses,
  countries,
  defaultName,
  defaultPhone,
  limit,
}: {
  addresses: SavedAddress[];
  countries: Country[];
  defaultName: string;
  defaultPhone: string;
  limit: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const countryLabel = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  function done(note?: string) {
    setEditing(null);
    setConfirmingDelete(null);
    setMessage(note ?? null);
    router.refresh();
  }

  async function run(id: string, action: () => Promise<{ ok: boolean }>, note: string) {
    setBusy(id);
    setMessage(null);
    try {
      const result = await action();
      setBusy(null);
      if (result.ok) done(note);
      else setMessage("That didn't work. Refresh the page and try again.");
    } catch {
      setBusy(null);
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-body text-muted">
        Changes apply to future orders. Orders you&apos;ve already placed keep the address they were sent to.
      </p>

      <p role="status" className="min-h-[1.5em] text-body font-semibold">{message}</p>

      {addresses.length === 0 && editing !== "new" ? (
        <p className="text-body text-muted">You haven&apos;t saved any addresses yet.</p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {addresses.map((a) => (
          <li key={a.id} className="border-hairline rounded-field p-5">
            {editing === a.id ? (
              <AddressForm
                address={a}
                countries={countries}
                defaultName={defaultName}
                defaultPhone={defaultPhone}
                onSaved={() => done("Address updated.")}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <address className="text-body not-italic">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.label || a.recipientName}
                    {a.isDefault ? (
                      <span className="border border-line/60 px-2 py-0.5 text-caption font-medium uppercase">Default</span>
                    ) : null}
                  </span>
                  {a.label ? <span className="block text-muted">{a.recipientName}</span> : null}
                  <span className="block text-muted">
                    {[a.line1, a.line2, a.city, a.region, a.postalCode].filter(Boolean).join(", ")}
                  </span>
                  <span className="block text-muted">{countryLabel(a.country)}</span>
                  <span className="block text-muted">{a.phone}</span>
                </address>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption">
                  {confirmingDelete === a.id ? (
                    <>
                      <span className="font-semibold">Delete this address?</span>
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => run(a.id, () => deleteAddressAction(a.id), "Address deleted.")}
                        className="underline underline-offset-4"
                      >
                        Confirm delete
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(null)} className="text-muted underline underline-offset-4">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null);
                          setEditing(a.id);
                        }}
                        className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 md:min-h-0"
                      >
                        <PencilIcon />
                        Edit<span className="sr-only"> {a.label || a.recipientName}</span>
                      </button>
                      {!a.isDefault ? (
                        <button
                          type="button"
                          disabled={busy === a.id}
                          onClick={() => run(a.id, () => setDefaultAddressAction(a.id), "Default address updated.")}
                          className="text-muted underline underline-offset-4 hover:text-ink"
                        >
                          Make default<span className="sr-only"> {a.label || a.recipientName}</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(a.id)}
                        className="inline-flex size-11 items-center justify-center text-muted hover:text-ink md:size-6"
                      >
                        <TrashIcon />
                        <span className="sr-only">Delete {a.label || a.recipientName}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="border-hairline rounded-field p-5">
          <h2 className="mb-5 text-heading-3 font-semibold">New address</h2>
          <AddressForm
            countries={countries}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
            onSaved={() => done("Address saved.")}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : addresses.length < limit ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setEditing("new");
            }}
            className="btn btn-outline btn-lg"
          >
            Add an address
          </button>
        </div>
      ) : (
        <p className="text-body text-muted">You&apos;ve saved the maximum of {limit} addresses.</p>
      )}
    </div>
  );
}
