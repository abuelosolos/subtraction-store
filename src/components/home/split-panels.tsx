import Image from "next/image";
import Link from "next/link";

const panels = [
  {
    label: "For Him",
    href: "/categories/men",
    src: "/images/panels/him.webp",
    alt: "Man carrying Gucci and Balenciaga shopping bags through a marble hallway",
  },
  {
    label: "For Her",
    href: "/categories/women",
    src: "/images/panels/her.webp",
    alt: "Woman in a headscarf holding shopping bags above her head",
  },
];

/**
 * Two full-height image panels. The label and button are `position: sticky`
 * and start at the top of each image; while the panel scrolls through the
 * viewport they stay pinned near the bottom of the screen, so relative to the
 * image they travel from its top edge to its bottom edge. Sticky needs every
 * ancestor to be overflow-visible, so only the inner image wrapper clips.
 * Height from md up: the hero frame is 1280x670 (ratio 0.523); panels are about
 * 20% taller (0.63 of the frame width), so they read longer than the hero.
 */
export function SplitPanels() {
  return (
    <section id="shop-by-gender" aria-label="Shop by gender" className="mx-auto grid w-full max-w-frame md:grid-cols-2">
      {panels.map(({ label, href, src, alt }) => (
        <div key={label} className="group relative min-h-[40rem] md:min-h-[calc(min(100vw,80rem)*0.63)]">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
          </div>
          <div className="sticky top-[calc(100svh-8rem)] z-10 mb-10 flex flex-col items-center gap-4 px-[var(--gutter)] text-center text-ink-on-dark">
            <h2 className="text-base font-medium">{label}</h2>
            <Link href={href} className="btn btn-on-image btn-lg">
              Shop now
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
