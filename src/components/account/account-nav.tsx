"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SideNav, sideNavItemClass, type SideNavLink } from "@/components/ui/side-nav";
import { authClient } from "@/lib/auth-client";

const links: readonly SideNavLink[] = [
  { label: "Orders", href: "/account" },
  { label: "Account info", href: "/account/settings" },
  { label: "Addresses", href: "/account/addresses" },
];

/** Account side menu, plus Sign out. */
export function AccountNav() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <SideNav label="Account sections" links={links}>
      <button type="button" onClick={onSignOut} disabled={signingOut} className={sideNavItemClass}>
        {signingOut ? "Signing out" : "Sign out"}
      </button>
    </SideNav>
  );
}
