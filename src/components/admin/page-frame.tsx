import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";

export type Crumb = { label: string; href?: string };

/**
 * Standard admin page: breadcrumb, title (+ optional status tag), a short
 * description, actions, and a Suspense boundary for the gated body.
 */
export function AdminPage({
  title,
  id,
  actions,
  crumbs,
  badge,
  description,
  children,
}: {
  title: string;
  id: string;
  actions?: ReactNode;
  crumbs?: Crumb[];
  badge?: ReactNode;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      {crumbs && crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="admin-crumbs">
          {crumbs.map((c, i) => (
            <span key={c.label} className="contents">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id={id} className="text-heading-3 font-semibold md:text-heading-2">{title}</h1>
            {badge}
          </div>
          {description ? <p className="mt-2 max-w-2xl text-body text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      <div className="pt-6 md:pt-8">
        <Suspense fallback={<p role="status" className="text-body text-muted">Loading</p>}>
          {children}
        </Suspense>
      </div>
    </section>
  );
}
