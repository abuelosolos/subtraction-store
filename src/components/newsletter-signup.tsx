"use client";

import { useId, useState, useTransition } from "react";

import { PlusIcon } from "@/components/ui/icons";
import { subscribeToNewsletter } from "@/lib/newsletter-actions";

/**
 * Newsletter block at the top of the footer: label, headline and a "+ Subscribe"
 * text button that reveals an email field. Renders on the footer's black surface.
 */
export function NewsletterSignup() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await subscribeToNewsletter(email);
      if (result.ok) {
        setMessage({ ok: true, text: "Thank you. You are on the list." });
        setEmail("");
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="container-page flex flex-col items-center gap-6 py-16 text-center md:py-24">
      <p id={`${id}-title`} className="text-caption font-medium uppercase">Sign up for SUBTRACTION. updates</p>
      <p className="max-w-[52rem] text-heading-2 font-light">
        Get exclusive updates on new drops, restocks and what we are building next.
      </p>

      {open ? (
        <form onSubmit={submit} noValidate className="flex w-full max-w-[28rem] flex-col gap-3 sm:flex-row">
          <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={message?.ok === false}
            aria-describedby={message ? `${id}-msg` : undefined}
            className="field flex-1"
            autoFocus
          />
          <button type="submit" disabled={pending} className="btn btn-inverse">
            {pending ? "Subscribing" : "Subscribe"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="inline-flex min-h-11 items-center gap-2 text-body font-medium"
        >
          <PlusIcon size={16} /> Subscribe
        </button>
      )}

      {message ? (
        <p id={`${id}-msg`} role="status" className={`text-caption ${message.ok ? "text-ink" : "text-muted"}`}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
