"use client";

import { SideNav, type SideNavLink } from "@/components/ui/side-nav";

const links: readonly SideNavLink[] = [
  { label: "Overview", href: "/admin" },
  { label: "Orders", href: "/admin/orders", prefix: true },
  { label: "Products", href: "/admin/products", prefix: true },
  { label: "Categories", href: "/admin/categories", prefix: true },
  { label: "Stock", href: "/admin/stock", prefix: true },
];

export function AdminNav() {
  return <SideNav label="Admin sections" links={links} />;
}
