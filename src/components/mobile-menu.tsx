"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { authClient } from "@/lib/auth-client";
import { cartCount, useCart } from "@/lib/cart-store";
import { primaryLinks } from "@/lib/nav-items";
import { useSignOut } from "@/lib/use-sign-out";

/**
 * Phone navigation: a hamburger button that opens a drawer from the right with
 * every item the bar drops below md. A native modal <dialog> gives focus trap
 * and Escape; open state is tied to the path so navigating closes it.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const menuId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const cartItems = cartCount(useCart());
  const signOut = useSignOut();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpenOn(null);

  return (
    <>
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenOn(pathname)}
      >
        <MenuIcon size={21} />
      </button>

      <dialog
        ref={dialogRef}
        id={menuId}
        className="mobile-menu"
        aria-label="Menu"
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="mobile-menu-head">
          <span className="font-brand text-brand font-bold">SUBTRACTION.</span>
          <button type="button" className="mobile-menu-close" onClick={close} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Menu" className="mobile-menu-body">
          <ul>
            {primaryLinks.map(({ label, href }) => (
              <li key={href}>
                <Link href={href} className="mobile-menu-item" onClick={close}>{label}</Link>
              </li>
            ))}
          </ul>

          <ul className="mobile-menu-group">
            <li>
              <Link href="/saved" className="mobile-menu-item" onClick={close}>Saved</Link>
            </li>
            <li>
              <Link href="/cart" className="mobile-menu-item" onClick={close}>
                Cart{cartItems > 0 ? ` (${cartItems})` : ""}
              </Link>
            </li>
          </ul>

          {user ? (
            <>
              <div className="mobile-menu-group">
                <p className="mobile-menu-heading">Profile</p>
                <ul>
                  <li>
                    <Link href="/account/settings" className="mobile-menu-item" onClick={close}>
                      Account settings
                    </Link>
                  </li>
                  <li>
                    <Link href="/account/addresses" className="mobile-menu-item" onClick={close}>
                      Addresses
                    </Link>
                  </li>
                </ul>
              </div>
              <ul className="mobile-menu-group">
                <li>
                  <Link href="/account" className="mobile-menu-item" onClick={close}>Orders</Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="mobile-menu-item"
                    onClick={async () => {
                      close();
                      await signOut();
                    }}
                  >
                    Sign out
                  </button>
                </li>
              </ul>
            </>
          ) : (
            <ul className="mobile-menu-group">
              <li>
                <Link href="/login" className="mobile-menu-item" onClick={close}>Sign in</Link>
              </li>
            </ul>
          )}
        </nav>
      </dialog>
    </>
  );
}
