import { FooterColumn } from "@/components/footer-column";

const columns = [
  { title: "Shop", links: ["New arrivals", "Men", "Women", "Outerwear", "Accessories"] },
  { title: "Help", links: ["Order status", "Shipping & delivery", "Returns", "Size guide", "Contact us"] },
  { title: "Company", links: ["Our story", "Journal", "Careers", "Stockists"] },
];

export function SiteFooter() {
  return (
    <footer className="surface-dark border-t border-line/30">
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
      </div>
      <div className="border-t border-line/30">
        <div className="container-page flex flex-col gap-2 py-6 text-caption text-muted md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 SUBTRACTION. All rights reserved.</p>
          <ul className="flex gap-6">
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
            <li><a href="#">Cookies</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
