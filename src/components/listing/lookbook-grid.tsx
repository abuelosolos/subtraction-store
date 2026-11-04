"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cardImages, type Image as Img } from "@/lib/catalog";
import type { ProductGroup } from "@/lib/product-filters";

type Tile = { key: string; slug: string; name: string; image: Img };

const tilesOf = (group: ProductGroup): Tile[] =>
  group.products.flatMap((p) =>
    cardImages(p).map((image, i) => ({ key: `${p.slug}:${i}`, slug: p.slug, name: p.name, image })),
  );

function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Lookbook: every photo of every product, edge to edge, under a small header per
 * category. Photos are reshuffled within each category once on the client, so the
 * server render is identical for everyone (and cacheable) and hydration matches.
 */
export function LookbookGrid({ groups }: { groups: ProductGroup[] }) {
  const [sections, setSections] = useState(() => groups.map((g) => ({ group: g, tiles: tilesOf(g) })));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(groups.map((g) => ({ group: g, tiles: shuffled(tilesOf(g)) })));
  }, [groups]);

  return (
    <div>
      {sections.map(({ group, tiles }, s) => (
        <section key={group.slug} aria-labelledby={`lookbook-${group.slug}`} className="pb-10">
          <h2 id={`lookbook-${group.slug}`} className="container-page py-4 text-caption font-medium uppercase">
            {group.name}
          </h2>
          <ul className="grid grid-cols-2 gap-x-0.5 gap-y-3 md:grid-cols-3 md:gap-y-0.5 lg:grid-cols-4">
            {tiles.map((tile, i) => (
              <li key={tile.key}>
                <Link href={`/products/${tile.slug}`} aria-label={tile.name} className="relative block aspect-[2/3] overflow-hidden bg-ink/[0.03]">
                  <Image
                    src={tile.image.src}
                    alt=""
                    width={tile.image.width}
                    height={tile.image.height}
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    priority={s === 0 && i < 4}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
