/** Navigation entries shared by the navbar, the profile menu and the mobile menu. */
export const primaryLinks = [
  { label: "New arrivals", href: "/new-arrivals" },
  { label: "Mens", href: "/categories/men" },
  { label: "Womens", href: "/categories/women" },
] as const;

export const accountItems = [
  { label: "Orders", href: "/account" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Account settings", href: "/account/settings" },
] as const;
