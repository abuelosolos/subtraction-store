import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// Layout from docs/design-system.md "Auth": 50/50 split at lg, image panel
// hidden below lg, form column capped at max-w-form.
// The panel photo is a stand-in until auth/*.webp exist (docs/image-manifest.md).
const panel = {
  src: "/images/categories/men.webp",
  alt: "Hooded figure in a black hoodie in a dark room",
};

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="surface-dark grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden py-[19px] pl-[38px] lg:block">
        <div className="relative h-full min-h-[610px] overflow-hidden rounded-panel">
          <Image
            src={panel.src}
            alt={panel.alt}
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="flex justify-center px-[var(--gutter)] pb-12 pt-[66px] lg:px-[97px]">
        <div className="flex w-full max-w-form flex-col gap-[29px]">
          <Link href="/" className="flex items-center gap-1 font-brand text-brand font-bold">
            SUBTRACTION.
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-heading-3 font-semibold">{title}</h1>
            <p className="mt-1 text-body text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
