import type { ReactNode } from "react";

/** Bordered section with an optional header (title + actions). */
export function AdminCard({
  title,
  actions,
  children,
  flush = false,
  className = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** No body padding (tables and lists that run edge to edge). */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`admin-card ${className}`}>
      {title || actions ? (
        <header className="admin-card-head">
          {title ? <h2 className="text-body font-semibold">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      <div className={flush ? undefined : "admin-card-body"}>{children}</div>
    </section>
  );
}
