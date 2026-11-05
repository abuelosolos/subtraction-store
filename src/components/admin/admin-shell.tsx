"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { logoutAction } from "@/app/(auth)/login/actions";
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

type Item = { label: string; href: string; icon: ReactNode; prefix?: boolean };

const overview: Item = { label: "Overview", href: "/admin", icon: <HomeIcon /> };
const orders: Item = { label: "Orders", href: "/admin/orders", icon: <OrdersIcon />, prefix: true };
const products: Item = { label: "Products", href: "/admin/products", icon: <ProductsIcon />, prefix: true };
const categories: Item = { label: "Categories", href: "/admin/categories", icon: <CategoriesIcon />, prefix: true };
const stock: Item = { label: "Stock", href: "/admin/stock", icon: <StockIcon />, prefix: true };

const groups: { label?: string; items: Item[] }[] = [
  { items: [overview] },
  { label: "Sales", items: [orders] },
  { label: "Catalogue", items: [products, categories] },
  { label: "Inventory", items: [stock] },
];

// Phone bottom nav: three primary destinations plus "More" for the rest.
const primary: Item[] = [overview, orders, products];
const more: Item[] = [categories, stock];

function isActive(pathname: string, { href, prefix }: Item) {
  return prefix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
}

function SignOutButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className="admin-nav-link w-[calc(100%-1rem)]" onClick={onNavigate}>
        <SignOutIcon />
        Sign out
      </button>
    </form>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto pb-4">
        {groups.map((group, i) => (
          <div key={group.label ?? i}>
            {group.label ? <p className="admin-nav-group-label">{group.label}</p> : <div className="pt-3" />}
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item) ? "page" : undefined}
                    className="admin-nav-link"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--admin-border)] py-3">
        <Link href="/" className="admin-nav-link">
          <ArrowLeftIcon />
          Back to shop
        </Link>
        <SignOutButton />
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
 * Admin frame: grouped sidebar from md up; below md a slim top bar plus a
 * fixed bottom nav, with a bottom sheet for the less-used links. Presentation
 * only; every page still does the real check in <AdminGate>.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Open state is "opened on this path", so navigating closes the sheet.
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
  const moreActive = more.some((item) => isActive(pathname, item));

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin">
        <div className="flex h-[var(--navbar-height)] items-center px-4">
          <Brand />
        </div>
        <Sidebar />
      </aside>

      <header className="admin-topbar">
        <Brand />
      </header>

      <main className="admin-main min-w-0">{children}</main>

      <nav className="admin-bottomnav" aria-label="Admin sections">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item) ? "page" : undefined}
            className="admin-bottomnav-item"
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="admin-bottomnav-item"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-active={moreActive || undefined}
          onClick={() => setOpenOn(pathname)}
        >
          <MenuIcon />
          <span>More</span>
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        className="admin-sheet"
        aria-label="More admin links"
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="admin-sheet-head">
          <span className="text-body font-semibold">More</span>
          <button type="button" className="admin-action" onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <ul>
          {more.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item) ? "page" : undefined}
                className="admin-nav-link"
                onClick={close}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/" className="admin-nav-link" onClick={close}>
              <ArrowLeftIcon />
              Back to shop
            </Link>
          </li>
          <li>
            <SignOutButton onNavigate={close} />
          </li>
        </ul>
      </dialog>
    </div>
  );
}
