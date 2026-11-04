import Image from "next/image";
import Link from "next/link";

import { lookbook } from "@/lib/catalog";

import { SectionHeading } from "./section-heading";

export function Lookbook() {
  const image = lookbook[0];
  return (
    <section aria-labelledby="lookbook-heading" className="surface-dark pb-[var(--section-y)]">
      <div className="container-page">
        <SectionHeading id="lookbook-heading" title="Explore Subtraction" />
      </div>
      {/* One full-width image, half the hero's height (hero frame is 1280x670, so 1280x335). */}
      <div className="relative mx-auto h-48 w-full max-w-frame overflow-hidden bg-ink/5 md:aspect-[1280/335] md:h-auto">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="object-cover object-[50%_10%]"
        />
        {/* Static (no scroll travel), near the bottom of the image. */}
        <div className="absolute inset-x-0 bottom-6 flex justify-center md:bottom-8">
          <Link href="/collections" className="btn btn-on-image btn-lg">
            Open lookbook
          </Link>
        </div>
      </div>
    </section>
  );
}
