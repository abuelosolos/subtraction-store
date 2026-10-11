/** Monochrome status chip: border + uppercase text (no colour, per the design system). */
export function StatusBadge({ children, strong }: { children: string; strong?: boolean }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-caption font-medium uppercase ${
        strong ? "border-ink text-ink" : "border-line/60 text-muted"
      }`}
    >
      {children}
    </span>
  );
}
