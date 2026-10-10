"use client";

import { useState, type FormEvent } from "react";

import { saveAddressAction } from "@/app/account/addresses/actions";
import type { SavedAddress } from "@/lib/addresses";

type Country = { code: string; name: string };

/** Add (no `address`) or edit (with `address`) one saved address. */
export function AddressForm({
  address,
  countries,
  defaultName,
  defaultPhone = "",
  onSaved,
  onCancel,
}: {
  address?: SavedAddress;
  countries: Country[];
  defaultName: string;
  defaultPhone?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const idPrefix = address ? `addr-${address.id}` : "addr-new";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    try {
      const result = await saveAddressAction({
        id: address?.id,
        label: text("label"),
        makeDefault: form.get("makeDefault") === "on",
        fullName: text("fullName"),
        phone: text("phone"),
        line1: text("line1"),
        line2: text("line2"),
        city: text("city"),
        region: text("region"),
        postalCode: text("postalCode"),
        country: text("country"),
      });

      if (result.ok) {
        onSaved();
        return;
      }
      setPending(false);
      if (result.reason === "validation") {
        setErrors(result.fieldErrors);
        setFormError("Check the highlighted details and try again.");
      } else if (result.reason === "limit_reached") {
        setFormError("You've reached the limit of saved addresses. Delete one first.");
      } else if (result.reason === "not_found") {
        setFormError("This address no longer exists. Refresh the page.");
      } else {
        setFormError("Please sign in again.");
      }
    } catch {
      setPending(false);
      setFormError("Something went wrong. Please try again.");
    }
  }

  const field = (name: string) => ({
    id: `${idPrefix}-${name}`,
    name,
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${idPrefix}-${name}-error` : undefined,
  });
  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${idPrefix}-${name}-error`} role="alert" className="mt-1 text-caption font-semibold">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-label={address ? "Edit address" : "Add address"}>
      <div>
        <label htmlFor={`${idPrefix}-label`} className="field-label">Label (optional)</label>
        <input {...field("label")} className="field" defaultValue={address?.label ?? ""} maxLength={50} placeholder="Home, Work" />
        {fieldError("label")}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-fullName`} className="field-label">Full name</label>
        <input {...field("fullName")} className="field" autoComplete="name" required maxLength={100} defaultValue={address?.recipientName ?? defaultName} />
        {fieldError("fullName")}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className="field-label">Phone number</label>
        <input {...field("phone")} type="tel" inputMode="tel" className="field" autoComplete="tel" required maxLength={40} defaultValue={address?.phone ?? defaultPhone} placeholder="+234 803 123 4567" />
        {fieldError("phone")}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-country`} className="field-label">Country</label>
        <select {...field("country")} className="field" autoComplete="country" defaultValue={address?.country ?? "NG"}>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        {fieldError("country")}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-line1`} className="field-label">Address</label>
        <input {...field("line1")} className="field" autoComplete="address-line1" required maxLength={200} defaultValue={address?.line1 ?? ""} />
        {fieldError("line1")}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-line2`} className="field-label">Apartment, suite, etc. (optional)</label>
        <input {...field("line2")} className="field" autoComplete="address-line2" maxLength={200} defaultValue={address?.line2 ?? ""} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-city`} className="field-label">City</label>
          <input {...field("city")} className="field" autoComplete="address-level2" required maxLength={100} defaultValue={address?.city ?? ""} />
          {fieldError("city")}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-region`} className="field-label">State or region (optional)</label>
          <input {...field("region")} className="field" autoComplete="address-level1" maxLength={100} defaultValue={address?.region ?? ""} />
        </div>
      </div>
      <div className="sm:max-w-[50%]">
        <label htmlFor={`${idPrefix}-postalCode`} className="field-label">Postal code (optional)</label>
        <input {...field("postalCode")} className="field" autoComplete="postal-code" maxLength={20} defaultValue={address?.postalCode ?? ""} />
      </div>

      {!address?.isDefault ? (
        <label className="flex items-center gap-3 text-body">
          <input type="checkbox" name="makeDefault" />
          Use as my default address
        </label>
      ) : null}

      <p role="alert" className="min-h-[1.5em] text-body font-semibold">{formError}</p>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">
          {pending ? "Saving" : address ? "Save changes" : "Save address"}
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className="btn btn-outline btn-lg">
          Cancel
        </button>
      </div>
    </form>
  );
}
