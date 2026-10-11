import type { ReactNode } from "react";

const LABEL = { ok: "Done", bad: "Error", warn: "Heads up", info: "Note" } as const;

/** Message with a text label and tone, so success and error never look alike. */
export function Notice({
  tone = "info",
  role,
  children,
}: {
  tone?: "ok" | "bad" | "warn" | "info";
  role?: "alert" | "status" | "note";
  children: ReactNode;
}) {
  return (
    <div className="admin-notice" data-tone={tone === "info" ? undefined : tone} role={role}>
      <span className="admin-notice-label">{LABEL[tone]}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
