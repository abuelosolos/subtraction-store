"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { addToCart } from "@/lib/cart-store";
import { toggleSaved, useSaved } from "@/lib/saved-store";

/** Size selector, Add to cart and Save controls for the product page. */
export function ProductActions({
  slug,
  name,
  sizes,
  soldOut,
}: {
  slug: string;
  name: string;
  sizes: string[];
  soldOut: boolean;
}) {
  const saved = useSaved().includes(slug);
  const [message, setMessage] = useState<{ text: string; cartLink: boolean } | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const size = sizes.length > 0 ? String(new FormData(event.currentTarget).get("size") ?? "") : null;
    if (sizes.length > 0 && !size) {
      setMessage({ text: "Select a size first.", cartLink: false });
      return;
    }
    const added = addToCart(slug, size || null);
    setMessage(
      added
        ? { text: `${name} added to your cart.`, cartLink: true }
        : { text: "Your cart is full. Remove an item to add another.", cartLink: true },
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6" aria-label="Add to cart">
      {sizes.length > 0 ? (
        <fieldset disabled={soldOut} className="min-w-0">
          <legend className="mb-3 flex w-full items-center justify-between text-body font-semibold">
            Select size
            <a href="#" className="text-caption font-normal text-muted underline underline-offset-4">
              Size guide
            </a>
          </legend>
          <div className="grid grid-cols-5 gap-2">
            {sizes.map((size) => (
              <label key={size} className="block">
                <input
                  type="radio"
                  name="size"
                  value={size}
                  className="peer sr-only"
                  required
                  onChange={() => setMessage(null)}
                />
                <span className="flex h-12 cursor-pointer items-center justify-center border border-line/40 text-body transition-colors duration-[var(--duration-standard)] hover:border-ink peer-checked:border-ink peer-checked:bg-surface-light peer-checked:text-ink-on-light peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ink)] peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
                  {size}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-3">
        <button type="submit" disabled={soldOut} className="btn btn-inverse btn-lg btn-block">
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => toggleSaved(slug)}
          className="btn btn-outline btn-lg btn-block"
        >
          {saved ? "Saved" : "Save to wishlist"}
        </button>
        <p role="status" className="min-h-[1.5em] text-body">
          {message?.text}{" "}
          {message?.cartLink ? (
            <Link href="/cart" className="underline underline-offset-4">View cart</Link>
          ) : null}
        </p>
      </div>
    </form>
  );
}
