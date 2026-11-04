import Link from "next/link";

export type CategoryTab = { label: string; href: string; active: boolean };

/**
 * Tab row under a department (Men / Women): the department first, then its
 * categories. The department tab opens the page with its hero; category tabs
 * carry ?gender= so they open the hero-less top. Scrolls sideways on phones.
 */
export function CategoryTabs({ tabs }: { tabs: CategoryTab[] }) {
  return (
    <nav aria-label="Categories">
      <ul className="flex gap-6 overflow-x-auto pb-4 text-caption [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ label, href, active }) => (
          <li key={label} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={active ? "font-semibold uppercase text-ink" : "text-muted hover:text-ink"}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
