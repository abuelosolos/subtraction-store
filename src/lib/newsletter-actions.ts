"use server";

export type NewsletterResult = { ok: true } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Footer newsletter sign-up. TODO: persist the address (a `newsletter_signups`
 * table via db:generate + db:migrate, or an email provider). Until then this only
 * validates, so nothing is stored.
 */
export async function subscribeToNewsletter(email: string): Promise<NewsletterResult> {
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !EMAIL.test(value)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true };
}
