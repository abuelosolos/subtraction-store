import Image from "next/image";

import "@/styles/footer.css";

import { FooterColumn } from "@/components/footer-column";
import { NewsletterSignup } from "@/components/newsletter-signup";

const policies = ["Privacy", "Terms", "Cookies"];

// Official artwork supplied by the owner (public/images/brands). Confirm the
// brand permissions before launch. All three are drawn white on the black footer.
const brands = [
  { name: "Gucci", src: "/images/brands/gucci.svg", width: 3721, height: 809, className: "h-5 w-auto" },
  { name: "Vivet", src: "/images/brands/vivet.svg", width: 80, height: 62, className: "h-10 w-auto" },
  { name: "Balenciaga", src: "/images/brands/balenciaga.svg", width: 193, height: 122, className: "h-14 w-auto" },
];

const columns = [
  {
    title: "Shop",
    links: [
      { label: "New arrivals", href: "/new-arrivals" },
      { label: "Men", href: "/categories/men" },
      { label: "Women", href: "/categories/women" },
      { label: "Outerwear", href: "/categories/outerwear" },
      { label: "Accessories", href: "/categories/accessories" },
    ],
  },
  {
    title: "Help",
    links: ["Shipping & delivery", "Returns", "Size guide", "Contact us"],
  },
  { title: "Company", links: [{ label: "Our story", href: "/story" }, "Journal", "Careers", "Stockists"] },
];

export function SiteFooter() {
  return (
    <footer className="surface-black">
      <NewsletterSignup />
      <div className="container-page grid gap-0 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)] md:gap-12 md:py-16">
        <div className="flex flex-col gap-4 max-md:mb-10">
          <p className="font-brand text-brand font-bold">SUBTRACTION.</p>
          <p className="max-w-[18rem] text-body text-muted">
            Premium black clothing. What happens when you take color away.
          </p>
        </div>
        {columns.map(({ title, links }) => (
          <FooterColumn key={title} title={title} links={links} />
        ))}
        {/* Phones: the policy links become their own dropdown above the copyright. */}
        <FooterColumn title="Terms & Policies" links={policies} mobileOnly />
      </div>
      <div>
        <ul aria-label="Featured brands" className="container-page flex flex-wrap items-center gap-x-10 gap-y-4 pt-10 text-muted">
          {brands.map(({ name, src, width, height, className }) => (
            <li key={name}>
              <Image src={src} alt={name} width={width} height={height} unoptimized className={`${className} opacity-80 brightness-0 invert`} />
            </li>
          ))}
        </ul>
        <div className="container-page flex flex-col gap-2 py-6 text-[0.6875rem] font-normal text-ink md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 SUBTRACTION. All rights reserved.</p>
          <ul className="hidden gap-6 md:flex">
            {policies.map((label) => (
              <li key={label}><a href="#">{label}</a></li>
            ))}
          </ul>
        </div>
        {/* Oversized wordmark: letter-spaced to the full content width, like the reference. */}
        <div className="container-page pb-8 pt-10 md:pb-12 md:pt-16" aria-hidden="true">
          <svg viewBox="0 0 1000 92" className="block w-full font-brand font-bold" fill="currentColor">
            <text x="0" y="88" fontSize="120" textLength="1000" lengthAdjust="spacing">SUBTRACTION</text>
          </svg>
        </div>
      </div>
    </footer>
  );
}
