"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { updateProfileAction } from "@/app/account/settings/actions";
import { authClient } from "@/lib/auth-client";

type Status = { kind: "ok" | "error"; text: string } | null;

export function SettingsForms({ name, email, phone }: { name: string; email: string; phone: string }) {
  const router = useRouter();

  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  async function onProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setProfilePending(true);
    setProfileStatus(null);
    setProfileErrors({});
    try {
      const result = await updateProfileAction({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
      });
      if (result.ok) {
        setProfileStatus({ kind: "ok", text: "Your details were updated." });
        router.refresh();
      } else if (result.reason === "validation") {
        setProfileErrors(result.fieldErrors);
        setProfileStatus({ kind: "error", text: "Check the highlighted fields." });
      } else {
        setProfileStatus({ kind: "error", text: "Your session has expired. Sign in again." });
      }
    } catch {
      setProfileStatus({ kind: "error", text: "Something went wrong. Please try again." });
    } finally {
      setProfilePending(false);
    }
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setPasswordStatus({ kind: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirm) {
      setPasswordStatus({ kind: "error", text: "The new passwords don't match." });
      return;
    }
    setPasswordPending(true);
    setPasswordStatus(null);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPasswordPending(false);
    if (result.error) {
      setPasswordStatus({
        kind: "error",
        text: result.error.message ?? "Couldn't change your password.",
      });
      return;
    }
    formElement.reset();
    setPasswordStatus({ kind: "ok", text: "Password changed. Other devices were signed out." });
  }

  const statusLine = (status: Status, id: string) => (
    <p id={id} role={status?.kind === "error" ? "alert" : "status"} className="min-h-[1.5em] text-body font-semibold">
      {status?.text}
    </p>
  );

  return (
    <div className="flex max-w-xl flex-col gap-12">
      <section aria-labelledby="profile-heading" className="flex flex-col gap-5">
        <h2 id="profile-heading" className="text-heading-3 font-semibold">Your details</h2>
        <form onSubmit={onProfile} className="flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="name" className="field-label">Name</label>
            <input
              id="name" name="name" className="field" defaultValue={name} autoComplete="name"
              maxLength={100} required aria-invalid={profileErrors.name ? true : undefined}
              aria-describedby={profileErrors.name ? "name-error" : undefined}
            />
            {profileErrors.name ? <p id="name-error" className="mt-1 text-caption font-semibold">{profileErrors.name}</p> : null}
          </div>
          <div>
            <label htmlFor="phone" className="field-label">Phone number</label>
            <input
              id="phone" name="phone" type="tel" inputMode="tel" className="field" defaultValue={phone}
              autoComplete="tel" placeholder="+234 803 123 4567" maxLength={40}
              aria-invalid={profileErrors.phone ? true : undefined}
              aria-describedby={profileErrors.phone ? "phone-error" : undefined}
            />
            {profileErrors.phone ? <p id="phone-error" className="mt-1 text-caption font-semibold">{profileErrors.phone}</p> : null}
            <p className="mt-1 text-caption text-subtle">Used to prefill delivery details at checkout.</p>
          </div>
          <div>
            <span className="field-label">Email</span>
            <p className="field text-muted" aria-readonly="true">{email}</p>
            <p className="mt-1 text-caption text-subtle">Changing your email isn&apos;t available yet.</p>
          </div>
          {statusLine(profileStatus, "profile-status")}
          <div>
            <button type="submit" disabled={profilePending} className="btn btn-inverse btn-lg">
              {profilePending ? "Saving" : "Save details"}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="password-heading" className="flex flex-col gap-5">
        <h2 id="password-heading" className="text-heading-3 font-semibold">Password</h2>
        <form onSubmit={onPassword} className="flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="currentPassword" className="field-label">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" className="field" autoComplete="current-password" required />
          </div>
          <div>
            <label htmlFor="newPassword" className="field-label">New password</label>
            <input id="newPassword" name="newPassword" type="password" className="field" autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="field-label">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" className="field" autoComplete="new-password" minLength={8} required />
          </div>
          {statusLine(passwordStatus, "password-status")}
          <div>
            <button type="submit" disabled={passwordPending} className="btn btn-inverse btn-lg">
              {passwordPending ? "Saving" : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
