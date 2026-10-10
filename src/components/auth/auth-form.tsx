"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-next";

const copy = {
  login: {
    submit: "Login",
    passwordLabel: "Password",
    autoComplete: "current-password",
    switchPrompt: "Don't have an account?",
    switchLabel: "Sign up",
    switchHref: "/register",
  },
  register: {
    submit: "Create account",
    passwordLabel: "Create a password",
    autoComplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Login",
    switchHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const text = copy[mode];

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setError(null);
    setPending(true);
    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: email.split("@")[0] || email });
    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  const invalid = error ? true : undefined;

  return (
    <>
      <form onSubmit={onSubmit} noValidate={false} className="flex flex-col gap-[29px]">
        <div>
          <label htmlFor="email" className="field-label">Your email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="field"
            aria-invalid={invalid}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">{text.passwordLabel}</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={text.autoComplete}
              className="field pr-10"
              aria-invalid={invalid}
              aria-describedby={error ? "auth-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword ? null : <path d="m4 4 16 16" />}
              </svg>
            </button>
          </div>
        </div>

        <p id="auth-error" role="alert" className="-my-3 min-h-[1.5em] text-body font-semibold">
          {error}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="btn btn-inverse btn-lg btn-block shadow-cta"
        >
          {pending ? "Please wait" : text.submit}
        </button>
      </form>

      <p className="text-center text-caption text-subtle">
        {text.switchPrompt}{" "}
        <Link
          href={{ pathname: text.switchHref, query: next === "/" ? undefined : { next } }}
          className="underline"
        >
          {text.switchLabel}
        </Link>
      </p>
    </>
  );
}
