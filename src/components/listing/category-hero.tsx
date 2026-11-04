import Image from "next/image";

import type { Image as CatalogImage } from "@/lib/catalog";

/**
 * Full-screen hero at the top of a category page. Carries id="hero", which the
 * navbar watches: it is transparent (light ink) over this image and turns white
 * once the hero has scrolled under it. Pair with <SiteNavbar heroTone="dark" />.
 */
export function CategoryHero({
  title,
  description,
  image,
  eyebrow = "Shop",
}: {
  title: string;
  description: string;
  image: CatalogImage;
  eyebrow?: string;
}) {
  return (
    <section id="hero" aria-labelledby="category-hero-title" className="relative h-[100svh] min-h-[32rem] w-full overflow-hidden bg-surface-dark text-ink-on-dark">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" aria-hidden="true" />
      <div className="container-page absolute inset-x-0 bottom-0 flex flex-col gap-2 pb-10 md:pb-14">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em]">{eyebrow}</p>
        <h1 id="category-hero-title" className="text-heading-3 font-medium">{title}</h1>
        <p className="max-w-[40rem] text-caption font-normal">{description}</p>
      </div>
    </section>
  );
}
