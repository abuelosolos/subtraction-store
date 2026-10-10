import type { Metadata } from "next";
import Link from "next/link";

import { SavedView } from "@/components/saved/saved-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export const metadata: Metadata = {
  title: "Saved items | SUBTRACTION.",
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">Saved items</li>
          </ol>
        </nav>
        <section aria-labelledby="saved-heading" className="pb-[var(--section-y)]">
          <div className="container-page">
            <h1 id="saved-heading" className="mb-4 text-heading-2 font-semibold">Saved items</h1>
            <p className="mb-8 max-w-prose text-body text-muted">
              Pieces you&apos;ve saved on this device.
            </p>
            <SavedView />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
