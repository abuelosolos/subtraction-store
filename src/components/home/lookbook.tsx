import Image from "next/image";

import { lookbook } from "@/lib/catalog";

import { SectionHeading } from "./section-heading";

export function Lookbook() {
  return (
    <section aria-labelledby="lookbook-heading" className="surface-dark pb-[var(--section-y)]">
      <div className="container-page">
        <SectionHeading id="lookbook-heading" title="Explore Subtraction" linkLabel="Open lookbook" />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {lookbook.map((item) => (
            <li key={item.src}>
              <div className="relative aspect-[3/4] overflow-hidden bg-ink/5">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
