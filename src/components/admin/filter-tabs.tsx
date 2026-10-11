import Link from "next/link";

export type FilterTab = { label: string; href: string; active: boolean; count?: number };

/** Link tabs for the common filters of a list (server-rendered, shareable URLs). */
export function FilterTabs({ label, tabs }: { label: string; tabs: FilterTab[] }) {
  return (
    <nav aria-label={label} className="admin-tabs">
      {tabs.map((t) => (
        <Link key={t.label} href={t.href} aria-current={t.active ? "page" : undefined} className="admin-tab">
          {t.label}
          {t.count !== undefined ? <span className="admin-tab-count">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
