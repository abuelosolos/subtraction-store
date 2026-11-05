"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

import { loginAction, type LoginState } from "@/app/(auth)/login/actions";

const initial: LoginState = { error: null };

/** Password-only admin login form. */
export function AuthForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(loginAction, initial);
  const [showPassword, setShowPassword] = useState(false);
  const invalid = state.error ? true : undefined;

  return (
    <form action={action} className="flex flex-col gap-[29px]">
      <input type="hidden" name="next" value={params.get("next") ?? ""} />

      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoFocus
            autoComplete="current-password"
            className="field pr-10"
            aria-invalid={invalid}
            aria-describedby={state.error ? "auth-error" : undefined}
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
        {state.error}
      </p>

      <button type="submit" disabled={pending} className="btn btn-inverse btn-lg btn-block shadow-cta">
        {pending ? "Please wait" : "Login"}
      </button>
    </form>
  );
}
