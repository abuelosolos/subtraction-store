/** Navigation entries shared by the navbar, the profile menu and the mobile menu. */
export const primaryLinks = [
  { label: "New arrivals", href: "/new-arrivals" },
  { label: "Mens", href: "/categories/men" },
  { label: "Womens", href: "/categories/women" },
] as const;

/** Category list in the desktop side drawer (the plus button). Bags and Pants are not in the catalogue yet. */
export const drawerCategories = [
  { label: "Womens", href: "/categories/women" },
  { label: "Mens", href: "/categories/men" },
  { label: "Jackets", href: "/categories/jackets" },
  { label: "Shirts", href: "/categories/shirts" },
  { label: "Beanies", href: "/categories/beanies" },
  { label: "Caps", href: "/categories/caps" },
  // Pages that used to be rails on the home page.
  { label: "New arrivals", href: "/new-arrivals" },
  { label: "Best sellers", href: "/best-sellers" },
  { label: "Accessories", href: "/categories/accessories" },
] as const;

/** PLACEHOLDERS: replace with the real contact details. */
export const contactInfo = {
  phone: "+234 000 000 0000",
  phoneHref: "tel:+2340000000000",
  email: "hello@example.com",
} as const;
