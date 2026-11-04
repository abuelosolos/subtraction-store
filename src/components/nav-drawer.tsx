"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { contactInfo, drawerCategories } from "@/lib/nav-items";

/**
 * Desktop navigation: a plus button at the right end of the bar that slides a
 * left-hand drawer out with the shop links. Same native modal <dialog> pattern
 * as MobileMenu (focus trap, Escape, backdrop click); open state is tied to the
 * path so navigating closes it. Hidden below md, where the hamburger menu
 * already lists these links. Styles: .nav-drawer in src/styles/navbar.css.
 */
export function NavDrawer() {
  const pathname = usePathname();
  const menuId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

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
        className="nav-drawer-trigger"
        aria-label="Open shop menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenOn(pathname)}
      >
        <PlusIcon size={21} />
      </button>

      <dialog
        ref={dialogRef}
        id={menuId}
        className="nav-drawer"
        aria-label="Shop menu"
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="mobile-menu-head justify-end">
          <button type="button" className="mobile-menu-close" onClick={close} aria-label="Close shop menu">
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Shop" className="mobile-menu-body">
          <ul>
            {drawerCategories.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="mobile-menu-item"
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={close}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="nav-drawer-meta">
            <li>
              <a href={`mailto:${contactInfo.email}`}>Contact us</a>
            </li>
            <li>
              <a href={contactInfo.phoneHref}>{contactInfo.phone}</a>
            </li>
          </ul>
        </nav>
      </dialog>
    </>
  );
}
