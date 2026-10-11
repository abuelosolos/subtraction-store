import type { ReactNode } from "react";
import { Suspense } from "react";

/** Standard admin page: heading, optional actions, and a Suspense boundary for the gated body. */
export function AdminPage({
  title,
  id,
  actions,
  children,
}: {
  title: string;
  id: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id={id} className="text-heading-2 font-semibold">{title}</h1>
        {actions}
      </div>
      <div className="pt-8">
        <Suspense fallback={<p role="status" className="text-body text-muted">Loading</p>}>
          {children}
        </Suspense>
      </div>
    </section>
  );
}
