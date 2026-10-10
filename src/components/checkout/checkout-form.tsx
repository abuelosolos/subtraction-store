"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { previewCheckoutAction, startCheckoutAction } from "@/app/checkout/actions";
import { describeCartError } from "@/components/checkout/cart-error-text";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { useHydrated } from "@/lib/local-store";
import type { CartError, PricedCart } from "@/lib/pricing";
import type { SavedAddress } from "@/lib/addresses";

type Country = { code: string; name: string };
type PreviewResult = Awaited<ReturnType<typeof previewCheckoutAction>>;

const NEW_ADDRESS = "new";

export function CheckoutForm({
  email,
  defaultName,
  defaultPhone,
  addresses,
  countries,
}: {
  email: string;
  defaultName: string;
  defaultPhone: string;
  addresses: SavedAddress[];
  countries: Country[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart();

  const initialChoice = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? NEW_ADDRESS;
  const [choice, setChoice] = useState<string>(initialChoice);
  const [formCountry, setFormCountry] = useState("NG");
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedSaved = addresses.find((a) => a.id === choice);
  const country = selectedSaved?.country ?? formCountry;

  // Advisory summary: re-fetched when the cart or delivery country changes.
  const key = useMemo(
    () => JSON.stringify([lines.map((l) => [l.slug, l.size, l.quantity]), country]),
    [lines, country],
  );
  const [preview, setPreview] = useState<{ key: string; result: PreviewResult } | null>(null);

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    let cancelled = false;
    previewCheckoutAction(
      lines.map((l) => ({ slug: l.slug, size: l.size, quantity: l.quantity })),
      country,
    )
      .then((result) => {
        if (!cancelled) setPreview({ key, result });
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({ key, result: { ok: false, errors: [{ code: "empty_cart" }] } });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, key, lines, country]);

  if (!hydrated) {
    return <p role="status" className="py-16 text-body text-muted">Loading checkout</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="py-16">
        <p className="text-body text-muted">Your cart is empty.</p>
        <Link href="/new-arrivals" className="btn btn-inverse btn-lg mt-6">Shop new arrivals</Link>
      </div>
    );
  }

  const current = preview?.key === key ? preview.result : null;
  const priced: PricedCart | null = current && "lines" in current ? current : null;
  const cartErrors: CartError[] =
    current && !current.ok
      ? current.errors.filter((e): e is CartError => e.code !== "unauthenticated")
      : [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const cartLines = lines.map((l) => ({ slug: l.slug, size: l.size, quantity: l.quantity }));

    const payload = selectedSaved
      ? { lines: cartLines, savedAddressId: selectedSaved.id }
      : {
          lines: cartLines,
          saveAddress,
          details: {
            fullName: text("fullName"),
            phone: text("phone"),
            line1: text("line1"),
            line2: text("line2"),
            city: text("city"),
            region: text("region"),
            postalCode: text("postalCode"),
            country: text("country"),
          },
        };

    try {
      const result = await startCheckoutAction(payload);
      if (result.ok) {
        // Leave for Paystack. The cart is only cleared after payment is confirmed.
        window.location.assign(result.authorizationUrl);
        return;
      }
      setSubmitting(false);
      switch (result.reason) {
        case "unauthenticated":
          router.push("/login?next=/checkout");
          break;
        case "validation": {
          const mapped: Record<string, string> = {};
          for (const [path, message] of Object.entries(result.fieldErrors)) {
            mapped[path.replace(/^details\./, "")] = message;
          }
          setFieldErrors(mapped);
          setFormError("Check the highlighted details and try again.");
          break;
        }
        case "invalid_cart":
          setFormError(
            <>
              {result.errors.map(describeCartError).join(" ")}{" "}
              <Link href="/cart" className="underline underline-offset-4">Review your cart</Link>
            </>,
          );
          break;
        case "sold_out":
          setFormError(
            <>
              Something in your cart just sold out.{" "}
              <Link href="/cart" className="underline underline-offset-4">Review your cart</Link>
            </>,
          );
          break;
        case "address_not_found":
          setFormError("That saved address is no longer available. Choose another.");
          break;
        case "payment_unavailable":
          setFormError("Payment is unavailable right now. Please try again in a moment.");
          break;
      }
    } catch {
      setSubmitting(false);
      setFormError("Something went wrong. Please try again.");
    }
  }

  const err = (name: string) => fieldErrors[name];
  const field = (name: string) => ({
    "aria-invalid": err(name) ? (true as const) : undefined,
    "aria-describedby": err(name) ? `${name}-error` : undefined,
  });
  const fieldError = (name: string) =>
    err(name) ? (
      <p id={`${name}-error`} role="alert" className="mt-1 text-caption font-semibold">{err(name)}</p>
    ) : null;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16"
      noValidate
    >
      <div className="flex flex-col gap-10">
        <section aria-labelledby="contact-heading" className="flex flex-col gap-5">
          <h2 id="contact-heading" className="text-heading-3 font-semibold">Contact</h2>
          <div>
            <span className="field-label">Email</span>
            <p className="field text-muted" aria-readonly="true">{email}</p>
          </div>
        </section>

        <section aria-labelledby="delivery-heading" className="flex flex-col gap-5">
          <h2 id="delivery-heading" className="text-heading-3 font-semibold">Delivery</h2>

          {addresses.length > 0 ? (
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="sr-only">Delivery address</legend>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-start gap-3 border-hairline rounded-field p-4 has-[:checked]:border-ink"
                >
                  <input
                    type="radio"
                    name="address"
                    value={a.id}
                    checked={choice === a.id}
                    onChange={() => setChoice(a.id)}
                    className="mt-1"
                  />
                  <span className="text-body">
                    <span className="block font-semibold">{a.recipientName}</span>
                    <span className="block text-muted">
                      {[a.line1, a.line2, a.city, a.region, a.postalCode].filter(Boolean).join(", ")}
                      {", "}
                      {countries.find((c) => c.code === a.country)?.name ?? a.country}
                    </span>
                    <span className="block text-muted">{a.phone}</span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 border-hairline rounded-field p-4 has-[:checked]:border-ink">
                <input
                  type="radio"
                  name="address"
                  value={NEW_ADDRESS}
                  checked={choice === NEW_ADDRESS}
                  onChange={() => setChoice(NEW_ADDRESS)}
                />
                <span className="text-body font-semibold">Use a new address</span>
              </label>
            </fieldset>
          ) : null}

          {!selectedSaved ? (
            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="fullName" className="field-label">Full name</label>
                <input
                  id="fullName" name="fullName" className="field" autoComplete="name"
                  defaultValue={defaultName} required maxLength={100} {...field("fullName")}
                />
                {fieldError("fullName")}
              </div>
              <div>
                <label htmlFor="phone" className="field-label">Phone number</label>
                <input
                  id="phone" name="phone" type="tel" inputMode="tel" className="field"
                  autoComplete="tel" placeholder="+234 803 123 4567" required maxLength={40}
                  defaultValue={defaultPhone}
                  {...field("phone")}
                />
                {fieldError("phone")}
              </div>
              <div>
                <label htmlFor="country" className="field-label">Country</label>
                <select
                  id="country" name="country" className="field" autoComplete="country"
                  value={formCountry} onChange={(e) => setFormCountry(e.target.value)}
                  {...field("country")}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                {fieldError("country")}
              </div>
              <div>
                <label htmlFor="line1" className="field-label">Address</label>
                <input
                  id="line1" name="line1" className="field" autoComplete="address-line1"
                  required maxLength={200} {...field("line1")}
                />
                {fieldError("line1")}
              </div>
              <div>
                <label htmlFor="line2" className="field-label">Apartment, suite, etc. (optional)</label>
                <input
                  id="line2" name="line2" className="field" autoComplete="address-line2"
                  maxLength={200} {...field("line2")}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="field-label">City</label>
                  <input
                    id="city" name="city" className="field" autoComplete="address-level2"
                    required maxLength={100} {...field("city")}
                  />
                  {fieldError("city")}
                </div>
                <div>
                  <label htmlFor="region" className="field-label">State or region (optional)</label>
                  <input
                    id="region" name="region" className="field" autoComplete="address-level1"
                    maxLength={100} {...field("region")}
                  />
                </div>
              </div>
              <div className="sm:max-w-[50%]">
                <label htmlFor="postalCode" className="field-label">Postal code (optional)</label>
                <input
                  id="postalCode" name="postalCode" className="field" autoComplete="postal-code"
                  maxLength={20} {...field("postalCode")}
                />
              </div>
              <label className="flex items-center gap-3 text-body">
                <input
                  type="checkbox" checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                Save this address for next time
              </label>
            </div>
          ) : null}
        </section>
      </div>

      <aside
        aria-labelledby="order-heading"
        className="h-fit border border-line/30 p-6 lg:sticky lg:top-[calc(var(--navbar-height)+1.5rem)]"
      >
        <h2 id="order-heading" className="text-heading-3 font-semibold">Your order</h2>

        {priced?.ok ? (
          <>
            <ul className="mt-6 flex flex-col gap-4 border-b border-line/30 pb-6">
              {priced.lines.map((l) => (
                <li key={`${l.slug}:${l.size ?? ""}`} className="flex justify-between gap-4 text-body">
                  <span className="min-w-0">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="block text-muted">
                      {l.size ? `Size ${l.size} · ` : ""}Qty {l.quantity} · {formatPrice(l.unitPriceKobo, priced.currency)}
                    </span>
                  </span>
                  <span className="font-medium">{formatPrice(l.lineTotalKobo, priced.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-6 flex flex-col gap-3 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatPrice(priced.subtotalKobo, priced.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd>{formatPrice(priced.shippingKobo, priced.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line/30 pt-3 font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(priced.totalKobo, priced.currency)}</dd>
              </div>
            </dl>
          </>
        ) : cartErrors.length > 0 ? (
          <div role="alert" className="mt-6 flex flex-col gap-2 text-body">
            {cartErrors.map((e, i) => (
              <p key={i}>{describeCartError(e)}</p>
            ))}
            <Link href="/cart" className="underline underline-offset-4">Review your cart</Link>
          </div>
        ) : (
          <p role="status" className="mt-6 text-body text-muted">Calculating your total</p>
        )}

        <p role="alert" className="mt-6 min-h-[1.5em] text-body font-semibold">{formError}</p>

        <button
          type="submit"
          disabled={submitting || !priced?.ok}
          className="btn btn-inverse btn-lg btn-block mt-2"
        >
          {submitting
            ? "Redirecting to Paystack"
            : priced?.ok
              ? `Pay ${formatPrice(priced.totalKobo, priced.currency)}`
              : "Pay"}
        </button>
        <p className="mt-4 text-caption text-subtle">
          You&apos;ll pay securely on Paystack. Your order is confirmed once we receive payment.
        </p>
      </aside>
    </form>
  );
}
