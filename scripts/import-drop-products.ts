// Import the photo folders in drop-products/ as live products.
//   npx tsx scripts/import-drop-products.ts            # convert images + write DB
//   npx tsx scripts/import-drop-products.ts --images   # convert images only
//
// Folder format: drop-products/<Folder>/<kind>-<N>.jpg where kind is front|side|back|item
// and N is the product number inside that folder (front-2, side-2, back-2, item-2 = product 2).
// Names, prices and stock below are placeholders: edit them in /admin afterwards.
//
// Idempotent and insert-only for products (never overwrites admin edits). Every other
// live product is archived (`archived_at`), so the sample catalogue disappears from the shop
// but stays in the DB for order history.
import fs from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import sharp from "sharp";

config({ path: ".env.local" });
config();

const DROP = path.resolve("drop-products");
const OUT = path.resolve("public/images/products");
const KINDS = ["front", "side", "back", "item"] as const;
type Kind = (typeof KINDS)[number];

type Spec = {
  dir: string;
  category: "beanies" | "caps" | "jackets" | "shirts";
  gender: "men" | "women";
  price: number; // whole naira, placeholder
  products: { name: string; color?: string; price?: number }[];
};

const SPECS: Spec[] = [
  {
    dir: "Beanies Female", category: "beanies", gender: "women", price: 35000,
    products: [
      { name: "Swirl Print Beanie", color: "Grey" },
      { name: "Ribbed Tag Beanie" },
      { name: "Tie-Dye Beanie", color: "Blue" },
      { name: "Fluffy Knit Beanie" },
      { name: "Leopard Beanie", color: "Grey" },
    ],
  },
  {
    dir: "Beanies Male", category: "beanies", gender: "men", price: 35000,
    products: [
      { name: "Label Rib Beanie" },
      { name: "Stripe Cuff Beanie" },
      { name: "Cable Knit Beanie" },
      { name: "Star Pom Beanie" },
    ],
  },
  {
    dir: "Caps Female", category: "caps", gender: "women", price: 40000,
    products: [
      { name: "Script Cap" },
      { name: "Star Cap" },
      { name: "Washed Patch Cap", color: "Grey" },
      { name: "Leather Patch Cap" },
      { name: "Classic Cap" },
    ],
  },
  {
    dir: "Jackets Female", category: "jackets", gender: "women", price: 220000,
    products: [
      { name: "Boxy Work Jacket", price: 185000 },
      { name: "Cropped Puffer Jacket", price: 240000 },
      { name: "Leather Bomber", price: 320000 },
      { name: "Cropped Blazer Jacket", price: 210000 },
    ],
  },
  {
    dir: "Jackets Men A", category: "jackets", gender: "men", price: 230000,
    products: [
      { name: "Heavy Puffer Jacket", price: 260000 },
      { name: "Denim Trucker Jacket", color: "Grey", price: 175000 },
      { name: "Hooded Zip Jacket", price: 195000 },
    ],
  },
  {
    dir: "Jackets Men B", category: "jackets", gender: "men", price: 150000,
    products: [
      { name: "Heavy Pullover Hoodie", price: 120000 },
      { name: "Utility Zip Jacket", price: 185000 },
      { name: "Heavy Zip Hoodie", price: 135000 },
    ],
  },
  {
    dir: "Shirts Female", category: "shirts", gender: "women", price: 75000,
    products: [
      { name: "Midnight Script Shirt", price: 85000 },
      { name: "Oversized Black Shirt" },
      { name: "Boxy Short-Sleeve Shirt" },
      { name: "Sheer Sleeve Shirt", price: 90000 },
      { name: "Stitched Overshirt" },
    ],
  },
  {
    dir: "Shirts Male", category: "shirts", gender: "men", price: 70000,
    products: [
      { name: "Camp Collar Shirt" },
      { name: "Satin Shirt", price: 85000 },
      { name: "Pinstripe Shirt" },
      { name: "Mesh Sleeve Shirt", price: 90000 },
      { name: "Washed Denim Shirt", color: "Grey" },
    ],
  },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Img = { kind: Kind; src: string; width: number; height: number };
type Item = {
  slug: string;
  name: string;
  category: Spec["category"];
  gender: Spec["gender"];
  color: string;
  price: number;
  images: Img[];
};

/** File name -> [kind, number]; fixes the "saide" typo. */
function parse(file: string): [Kind, number] | null {
  const m = /^(front|side|saide|back|item)-(\d+)\.jpe?g$/i.exec(file);
  if (!m) return null;
  const kind = (m[1].toLowerCase() === "saide" ? "side" : m[1].toLowerCase()) as Kind;
  return [kind, Number(m[2])];
}

async function convertAll(): Promise<Item[]> {
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const spec of SPECS) {
    const dir = path.join(DROP, spec.dir);
    const files = fs.readdirSync(dir);
    const byNumber = new Map<number, Map<Kind, string>>();
    for (const f of files) {
      const p = parse(f);
      if (!p) {
        if (!f.startsWith(".")) console.warn(`  skipped (unrecognised name): ${spec.dir}/${f}`);
        continue;
      }
      if (!byNumber.has(p[1])) byNumber.set(p[1], new Map());
      byNumber.get(p[1])!.set(p[0], path.join(dir, f));
    }
    const max = Math.max(...byNumber.keys());
    if (max !== spec.products.length) {
      throw new Error(`${spec.dir}: found ${max} products on disk but ${spec.products.length} names configured`);
    }
    for (let n = 1; n <= max; n++) {
      const def = spec.products[n - 1];
      const slug = slugify(`${def.name}-${spec.gender === "men" ? "m" : "w"}`);
      if (seen.has(slug)) throw new Error(`Duplicate slug ${slug}`);
      seen.add(slug);
      const sources = byNumber.get(n);
      if (!sources) throw new Error(`${spec.dir}: product ${n} has no files`);
      const images: Img[] = [];
      for (const kind of KINDS) {
        const file = sources.get(kind);
        if (!file) continue;
        const outDir = path.join(OUT, slug);
        fs.mkdirSync(outDir, { recursive: true });
        const { data, info } = await sharp(file)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true });
        fs.writeFileSync(path.join(outDir, `${kind}.webp`), data);
        images.push({ kind, src: `/images/products/${slug}/${kind}.webp`, width: info.width, height: info.height });
      }
      const missing = KINDS.filter((k) => !sources.has(k));
      console.log(`${slug.padEnd(34)} ${images.map((i) => `${i.kind}:${i.width}`).join(" ")}${missing.length ? `  (no ${missing.join(", ")})` : ""}`);
      items.push({
        slug,
        name: def.name,
        category: spec.category,
        gender: spec.gender,
        color: def.color ?? "Black",
        price: def.price ?? spec.price,
        images,
      });
    }
  }
  return items;
}

/** Card image: the side view (front if a product has no side shot). */
function primary(images: Img[]): Img {
  return images.find((i) => i.kind === "side") ?? images.find((i) => i.kind === "front") ?? images[0];
}

const DESCRIPTIONS: Record<Spec["category"], string> = {
  beanies: "A close-fitting knit beanie in a soft, warm yarn. One size.",
  caps: "A structured six-panel cap with an adjustable strap. One size.",
  jackets: "A considered outer layer in a clean black silhouette, cut with room to layer under.",
  shirts: "A relaxed shirt in a dark, quiet fabric with a clean finish.",
};
const CATEGORY_NAME: Record<Spec["category"], string> = {
  beanies: "Beanies",
  caps: "Caps",
  jackets: "Jackets",
  shirts: "Shirts",
};
const CATEGORY_ORDER: Record<Spec["category"], number> = { jackets: 20, shirts: 21, beanies: 22, caps: 23 };
const apparel = ["XS", "S", "M", "L", "XL"];

async function main() {
  console.log("Converting images...");
  const items = await convertAll();
  if (process.argv.includes("--images")) return;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const { and, inArray, isNull, notInArray } = await import("drizzle-orm");
  const { db } = await import("../src/db/index");
  const { categories, productImages, products, stock } = await import("../src/db/schema");

  await db
    .insert(categories)
    .values(
      (Object.keys(CATEGORY_NAME) as Spec["category"][]).map((slug) => ({
        slug,
        name: CATEGORY_NAME[slug],
        sortOrder: CATEGORY_ORDER[slug],
        showOnHome: false,
      })),
    )
    .onConflictDoNothing({ target: categories.slug });
  const catRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));

  // Interleave men and women so New arrivals mixes both. Index 0 is newest.
  const men = items.filter((i) => i.gender === "men");
  const women = items.filter((i) => i.gender === "women");
  const ordered: Item[] = [];
  for (let i = 0; i < Math.max(men.length, women.length); i++) {
    if (women[i]) ordered.push(women[i]);
    if (men[i]) ordered.push(men[i]);
  }
  const now = Date.now();

  await db
    .insert(products)
    .values(
      ordered.map((item, idx) => {
        const main = primary(item.images);
        return {
          slug: item.slug,
          name: item.name,
          description: DESCRIPTIONS[item.category],
          categoryId: catId.get(item.category)!,
          priceCents: item.price * 100,
          currency: "NGN",
          badge: idx < 4 ? "New" : idx % 7 === 3 ? "Best seller" : null,
          imageSrc: main.src,
          imageWidth: main.width,
          imageHeight: main.height,
          imageAlt: `${item.name}, ${main.kind} view`,
          sizes: item.category === "jackets" || item.category === "shirts" ? apparel : [],
          isBestSeller: idx % 7 === 3,
          gender: item.gender,
          color: item.color,
          createdAt: new Date(now - idx * 86_400_000),
        };
      }),
    )
    .onConflictDoNothing({ target: products.slug });

  const slugs = ordered.map((i) => i.slug);
  const rows = await db.select({ id: products.id, slug: products.slug }).from(products).where(inArray(products.slug, slugs));
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  await db
    .insert(stock)
    .values(rows.map((r) => ({ productId: r.id, quantity: 10 })))
    .onConflictDoNothing({ target: stock.productId });

  await db
    .insert(productImages)
    .values(
      ordered.flatMap((item) =>
        item.images.map((img, position) => ({
          productId: idBySlug.get(item.slug)!,
          position,
          kind: img.kind,
          src: img.src,
          width: img.width,
          height: img.height,
          alt: `${item.name}, ${img.kind} view`,
        })),
      ),
    )
    .onConflictDoNothing();

  const archived = await db
    .update(products)
    .set({ archivedAt: new Date() })
    .where(and(isNull(products.archivedAt), notInArray(products.slug, slugs)))
    .returning({ slug: products.slug });

  console.log(`\nImported ${rows.length} products. Archived ${archived.length}: ${archived.map((a) => a.slug).join(", ")}`);
  console.log("Restart the dev server (or wait for the cache to expire) to see them.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
