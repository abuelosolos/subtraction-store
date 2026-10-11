export type Tone = "ok" | "warn" | "bad" | "neutral";

/** Status tag: a dot plus the word in a muted tone (never colour alone). */
export function StatusBadge({ children, tone = "neutral" }: { children: string; tone?: Tone }) {
  return (
    <span className="admin-tag" data-tone={tone}>
      {children}
    </span>
  );
}
