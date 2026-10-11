"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { PlusMinusIcon } from "@/components/ui/plus-minus-icon";

/**
 * One footer link group. From md up it is a plain heading with the links
 * always visible. Below md the heading is a full-width button with a plus
 * (minus when open) and the links expand beneath it.
 */
export function FooterColumn({
  title,
  links,
  mobileOnly = false,
}: {
  title: string;
  /** Plain labels (placeholder `#` links) or label + href. */
  links: (string | { label: string; href: string })[];
  /** Rendered only below md (e.g. a group that sits in the bottom bar on desktop). */
  mobileOnly?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label={title}
      className={`max-md:border-b max-md:border-line/30 max-md:first-of-type:border-t${mobileOnly ? " md:hidden" : ""}`}
    >
      {/* Desktop heading */}
      <h2 className="mb-4 hidden text-caption font-medium uppercase text-muted md:block">{title}</h2>

      {/* Mobile accordion trigger */}
      <h2 className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-links`}
          onClick={() => setOpen((v) => !v)}
          className="group flex min-h-14 w-full items-center justify-between text-left text-caption font-medium uppercase"
        >
          {title}
          <PlusMinusIcon />
        </button>
      </h2>

      {/* Row height animates 0fr to 1fr; closed links are visibility:hidden on
          phones so they leave the tab order and the accessibility tree. */}
      <div
        id={`${id}-links`}
        className={`grid transition-[grid-template-rows,visibility] duration-[var(--duration-standard)] ease-[var(--ease-standard)] motion-reduce:transition-none md:visible md:grid-rows-[1fr] ${
          open ? "grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
        }`}
      >
        <ul className="flex min-h-0 flex-col overflow-hidden text-body md:gap-3">
          {links.map((link) => {
            const { label, href } = typeof link === "string" ? { label: link, href: "#" } : link;
            return (
            <li key={label}>
              <Link
                href={href}
                className="flex min-h-11 items-center hover:underline hover:underline-offset-4 md:min-h-0"
              >
                {label}
              </Link>
            </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
