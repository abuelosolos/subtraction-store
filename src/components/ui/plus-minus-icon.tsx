/**
 * Plus that becomes a minus when the surrounding `group` has
 * `aria-expanded="true"` (put `group` on the trigger button).
 */
export function PlusMinusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 8h12" />
      <path
        d="M8 2v12"
        className="origin-center transition-transform duration-[var(--duration-standard)] ease-[var(--ease-standard)] group-aria-expanded:scale-y-0 motion-reduce:transition-none"
      />
    </svg>
  );
}
