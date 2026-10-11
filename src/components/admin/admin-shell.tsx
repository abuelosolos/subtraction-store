"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  ArrowLeftIcon,
  CategoriesIcon,
  CloseIcon,
  HomeIcon,
  MenuIcon,
  OrdersIcon,
  ProductsIcon,
  SignOutIcon,
  StockIcon,
} from "@/components/ui/icons";
import { useSignOut } from "@/lib/use-sign-out";

type Item = { label: string; href: string; icon: ReactNode; prefix?: boolean };

const groups: { label?: string; items: Item[] }[] = [
  { items: [{ label: "Overview", href: "/admin", icon: <HomeIcon /> }] },
  { label: "Sales", items: [{ label: "Orders", href: "/admin/orders", icon: <OrdersIcon />, prefix: true }] },
  {
    label: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", icon: <ProductsIcon />, prefix: true },
      { label: "Categories", href: "/admin/categories", icon: <CategoriesIcon />, prefix: true },
    ],
  },
  { label: "Inventory", items: [{ label: "Stock", href: "/admin/stock", icon: <StockIcon />, prefix: true }] },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  return (
    <>
      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto pb-4">
        {groups.map((group, i) => (
          <div key={group.label ?? i}>
            {group.label ? <p className="admin-nav-group-label">{group.label}</p> : <div className="pt-3" />}
            <ul>
              {group.items.map(({ label, href, icon, prefix }) => {
                const active = prefix
                  ? pathname === href || pathname.startsWith(`${href}/`)
                  : pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className="admin-nav-link"
                      onClick={onNavigate}
                    >
                      {icon}
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--admin-border)] py-3">
        <Link href="/" className="admin-nav-link" onClick={onNavigate}>
          <ArrowLeftIcon />
          Back to shop
        </Link>
        <button
          type="button"
          className="admin-nav-link w-[calc(100%-1rem)]"
          onClick={async () => {
            onNavigate?.();
            await signOut();
          }}
        >
          <SignOutIcon />
          Sign out
        </button>
      </div>
    </>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="font-brand text-brand font-bold">
      SUBTRACTION.{" "}
      <span className="text-caption font-medium uppercase text-muted">Admin</span>
    </Link>
  );
}

/**
 * Admin frame: grouped sidebar from md up, top bar + right-hand drawer below.
 * Presentation only; every page still does the real role check in <AdminGate>.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Open state is "opened on this path", so navigating closes the drawer.
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
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin">
        <div className="flex h-[var(--navbar-height)] items-center px-4">
          <Brand />
        </div>
        <NavLinks />
      </aside>

      <header className="admin-topbar">
        <Brand />
        <button
          type="button"
          aria-label="Menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="mobile-menu-trigger"
          onClick={() => setOpenOn(pathname)}
        >
          <MenuIcon size={21} />
        </button>
      </header>

      <dialog
        ref={dialogRef}
        className="mobile-menu"
        aria-label="Admin menu"
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="mobile-menu-head">
          <Brand />
          <button type="button" className="mobile-menu-close" onClick={close} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <NavLinks onNavigate={close} />
        </div>
      </dialog>

      <main className="admin-main min-w-0">{children}</main>
    </div>
  );
}
