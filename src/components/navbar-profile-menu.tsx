"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

const items = [
  { label: "Orders", href: "/account" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Account settings", href: "/account/settings" },
] as const;

const HOVER_CLOSE_DELAY_MS = 150;

/**
 * Profile menu for the navbar. Opens on hover (mouse only), and also on
 * keyboard activation and tap, so nothing depends on hover. Closes on Escape,
 * outside click, focus leaving, and navigation (open state is tied to the path).
 */
export function NavbarProfileMenu({
  name,
  email,
  isAdmin = false,
  children,
}: {
  name: string;
  email: string;
  /** Display only: shows a link to /admin, which re-checks the role itself. */
  isAdmin?: boolean;
  /** The trigger's icon and label, rendered by the navbar so styles match. */
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef(false);

  // Open state is "opened on this path", so navigating closes it for free.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const clearTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const show = () => {
    clearTimer();
    setOpenOn(pathname);
  };
  const hide = () => {
    clearTimer();
    openedByHover.current = false;
    setOpenOn(null);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) hide();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // hide is stable enough: it only touches refs and the state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => clearTimer, []);

  return (
    <div
      ref={rootRef}
      className="navbar-profile"
      data-open={open}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        openedByHover.current = true;
        show();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        clearTimer();
        closeTimer.current = setTimeout(hide, HOVER_CLOSE_DELAY_MS);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          hide();
          triggerRef.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) hide();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        className="flex items-center gap-[3px] px-[5px]"
        onClick={() => {
          // A click right after hover-opening should not immediately close it.
          if (open && openedByHover.current) {
            openedByHover.current = false;
            return;
          }
          if (open) hide();
          else show();
        }}
      >
        {children}
      </button>

      <div id={menuId} className="navbar-menu" hidden={!open}>
        <div className="navbar-menu-panel">
          <div className="px-4 pb-3 pt-2">
            <p className="truncate text-body font-semibold">{name}</p>
            <p className="truncate text-caption text-[color:var(--navbar-menu-muted)]">{email}</p>
          </div>
          <nav aria-label="Account" className="pt-1">
            {items.map(({ label, href }) => (
              <Link key={href} href={href} className="navbar-menu-item" onClick={hide}>
                {label}
              </Link>
            ))}
            {isAdmin ? (
              <Link href="/admin" className="navbar-menu-item" onClick={hide}>
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="pt-1">
            <button
              type="button"
              className="navbar-menu-item"
              onClick={async () => {
                hide();
                await authClient.signOut();
                router.push("/");
                router.refresh();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
