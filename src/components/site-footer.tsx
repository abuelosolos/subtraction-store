const columns = [
  { title: "Shop", links: ["New arrivals", "Men", "Women", "Outerwear", "Accessories"] },
  { title: "Help", links: ["Order status", "Shipping & delivery", "Returns", "Size guide", "Contact us"] },
  { title: "Company", links: ["Our story", "Journal", "Careers", "Stockists"] },
];

export function SiteFooter() {
  return (
    <footer className="surface-dark border-t border-line/30">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <p className="font-brand text-brand font-bold">SUBTRACTION.</p>
          <p className="max-w-[18rem] text-body text-muted">
            Premium black clothing. What happens when you take color away.
          </p>
        </div>
        {columns.map(({ title, links }) => (
          <nav key={title} aria-label={title}>
            <h2 className="mb-4 text-caption font-medium uppercase text-muted">{title}</h2>
            <ul className="flex flex-col gap-3 text-body">
              {links.map((label) => (
                <li key={label}>
                  <a href="#" className="hover:underline hover:underline-offset-4">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
