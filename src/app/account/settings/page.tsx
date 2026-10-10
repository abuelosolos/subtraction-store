import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsForms } from "@/components/account/settings-forms";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Account info | SUBTRACTION.",
  robots: { index: false },
};

export default function SettingsPage() {
  return (
    <section aria-labelledby="settings-heading">
      <h1 id="settings-heading" className="text-heading-2 font-semibold">Account info</h1>
      <div className="pt-8">
        <Suspense fallback={<p role="status" className="text-body text-muted">Loading your account</p>}>
          <Settings />
        </Suspense>
      </div>
    </section>
  );
}

async function Settings() {
  const user = await requireUser("/account/settings");
  return <SettingsForms name={user.name} email={user.email} phone={user.phone ?? ""} />;
}
