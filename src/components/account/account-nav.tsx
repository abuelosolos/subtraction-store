"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

const links = [
  { label: "Orders", href: "/account" },
  { label: "Account info", href: "/account/settings" },
  { label: "Addresses", href: "/account/addresses" },
] as const;

const itemClass =
  "flex min-h-11 shrink-0 items-center whitespace-nowrap border-b border-transparent text-body text-muted transition-colors duration-[var(--duration-standard)] ease-[var(--ease-standard)] hover:text-ink aria-[current=page]:border-ink aria-[current=page]:text-ink md:border-b-0 md:border-l md:pl-4 md:aria-[current=page]:border-ink";

/**
 * Account side menu. A vertical column from md up; a horizontally scrollable
 * row above the content on small screens. Sign out lives here too.
 */
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav
      aria-label="Account sections"
      className="flex gap-6 overflow-x-auto border-b border-line/30 md:sticky md:top-[calc(var(--navbar-height)+2rem)] md:flex-col md:gap-1 md:self-start md:overflow-visible md:border-b-0 md:border-l md:border-line/30"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={`${itemClass} -mb-px md:mb-0 md:-ml-px`}
        >
          {link.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className={`${itemClass} -mb-px md:mb-0 md:-ml-px`}
      >
        {signingOut ? "Signing out" : "Sign out"}
      </button>
    </nav>
  );
}
