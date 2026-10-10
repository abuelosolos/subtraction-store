// Idempotent seed: categories -> products -> stock. Run with `npm run db:seed`.
// Data was lifted from the former in-memory sample catalogue (src/lib/catalog.ts).
// Existing stock quantities are never overwritten, so re-seeding is safe.
import { config } from "dotenv";
import { sql } from "drizzle-orm";

type Img = { src: string; width: number; height: number; alt: string };

const categorySeed: {
  slug: string;
  name: string;
  image?: Img;
  sortOrder: number;
  showOnHome: boolean;
}[] = [
  { slug: "men", name: "Men's", sortOrder: 0, showOnHome: true, image: { src: "/images/categories/men.webp", width: 1000, height: 1389, alt: "Hooded figure in a black hoodie in a dark room" } },
  { slug: "women", name: "Women's", sortOrder: 1, showOnHome: true, image: { src: "/images/categories/women.webp", width: 1000, height: 1250, alt: "Woman in a black coat walking through a dark stone building" } },
  { slug: "outerwear", name: "Outerwear", sortOrder: 2, showOnHome: true, image: { src: "/images/categories/outerwear.webp", width: 1000, height: 1332, alt: "Black leather jacket laid on black fabric" } },
  { slug: "accessories", name: "Accessories", sortOrder: 3, showOnHome: true, image: { src: "/images/categories/accessories.webp", width: 1000, height: 1500, alt: "Black handbag in hard light on a white block" } },
  { slug: "hoodies", name: "Hoodies", sortOrder: 10, showOnHome: false },
  { slug: "t-shirts", name: "T-shirts", sortOrder: 11, showOnHome: false },
  { slug: "knitwear", name: "Knitwear", sortOrder: 12, showOnHome: false },
  { slug: "denim", name: "Denim", sortOrder: 13, showOnHome: false },
  { slug: "footwear", name: "Footwear", sortOrder: 14, showOnHome: false },
];

const apparel = ["XS", "S", "M", "L", "XL"];
const sizesByCategory: Record<string, string[]> = {
  outerwear: apparel,
  hoodies: apparel,
  "t-shirts": apparel,
  women: apparel,
  knitwear: apparel,
  denim: ["28", "30", "32", "34", "36"],
  footwear: ["39", "40", "41", "42", "43", "44", "45"],
  accessories: [],
};

type ProductSeed = {
  slug: string;
  name: string;
  category: string; // category slug
  price: number; // whole USD dollars
  badge?: string;
  stock: number;
  description: string;
  image: Img;
};

// Order inside each group is display order (see ageDays below).
const newArrivals: ProductSeed[] = [
  { slug: "gloss-puffer", name: "Gloss Puffer Jacket", category: "outerwear", price: 420, badge: "New", stock: 12, description: "A high-gloss puffer in lightweight black nylon with a detachable hood and a relaxed, boxy cut. Warm without bulk.", image: { src: "/images/products/gloss-puffer.webp", width: 900, height: 1349, alt: "Black glossy puffer jacket worn with a cap, side profile" } },
  { slug: "everyday-hoodie", name: "Everyday Hoodie", category: "hoodies", price: 140, stock: 3, description: "Heavyweight brushed-back cotton, a clean silhouette and nothing on it. The hoodie you reach for first.", image: { src: "/images/products/everyday-hoodie.webp", width: 900, height: 1350, alt: "Man in a black zip hoodie and black trousers against a white wall" } },
  { slug: "moto-jacket", name: "Moto Leather Jacket", category: "outerwear", price: 590, badge: "Limited", stock: 0, description: "Soft lambskin leather with a classic asymmetric zip and a slim, cropped body. Limited run.", image: { src: "/images/categories/outerwear.webp", width: 1000, height: 1332, alt: "Black leather moto jacket laid flat on black fabric" } },
  { slug: "heavy-tee", name: "Heavyweight Tee", category: "t-shirts", price: 65, stock: 40, description: "A dense 260gsm cotton tee with a dropped shoulder and a clean neckline. Cut to hold its shape.", image: { src: "/images/products/heavy-tee.webp", width: 900, height: 1350, alt: "Man in a plain black t-shirt and round sunglasses" } },
  { slug: "trench-coat", name: "Long Trench Coat", category: "women", price: 380, badge: "New", stock: 7, description: "A long, fluid trench in matte black twill with a belted waist and a storm flap. Sharp without trying.", image: { src: "/images/products/trench-coat.webp", width: 900, height: 1350, alt: "Woman in a long black trench coat walking through a glass corridor" } },
  { slug: "tailored-set", name: "Tailored Black Set", category: "women", price: 460, stock: 2, description: "A tailored single-breasted jacket with matching wide-leg trousers. Worn together or apart.", image: { src: "/images/products/tailored-set.webp", width: 900, height: 1125, alt: "Woman in a black tailored jacket and trousers leaning on a rail" } },
  { slug: "low-sneaker", name: "Low Leather Sneaker", category: "footwear", price: 180, stock: 18, description: "A minimal low-top in smooth black leather on a clean cupsole, with no logos and no noise.", image: { src: "/images/products/low-sneaker.webp", width: 900, height: 1600, alt: "Black leather low-top sneaker floating above an open hand" } },
  { slug: "structured-tote", name: "Structured Tote", category: "accessories", price: 240, stock: 5, description: "A structured, unlined tote in grained leather with a magnetic closure and an internal zip pocket.", image: { src: "/images/products/structured-tote.webp", width: 900, height: 1199, alt: "Hand holding a black structured tote bag against a grey background" } },
];

const bestSellers: ProductSeed[] = [
  { slug: "crewneck-set", name: "Black Crewneck", category: "knitwear", price: 110, badge: "Best seller", stock: 22, description: "A fine-gauge black crewneck in a soft cotton blend with a slim fit through the body and sleeve.", image: { src: "/images/products/crewneck-set.webp", width: 900, height: 1260, alt: "Man posing in a black long-sleeve crewneck and black trousers" } },
  { slug: "black-denim", name: "Black Raw Denim", category: "denim", price: 150, stock: 15, description: "Raw black denim with a straight, tapered leg. Dark from day one and darker with wear.", image: { src: "/images/products/black-denim.webp", width: 900, height: 900, alt: "Folded pair of black raw denim jeans on a light grey background" } },
  { slug: "lace-slip-dress", name: "Lace Slip Dress", category: "women", price: 320, stock: 4, description: "A bias-cut slip dress with a layered lace bodice and a fluid skirt, finished with a satin tie waist.", image: { src: "/images/products/lace-slip-dress.webp", width: 900, height: 1339, alt: "Black lace slip dress on a mannequin in black and white" } },
  { slug: "wide-trouser-set", name: "Wide Trouser Set", category: "women", price: 290, badge: "Best seller", stock: 9, description: "A black camisole and high-waisted wide-leg trousers cut from a fluid, drapey crepe.", image: { src: "/images/products/wide-trouser-set.webp", width: 900, height: 1374, alt: "Woman crouching in a black camisole, black wide trousers and heels" } },
  { slug: "engineer-boot", name: "Engineer Boot", category: "footwear", price: 360, stock: 0, description: "A full-grain leather engineer boot with a harness strap and a stacked sole. Built to be resoled.", image: { src: "/images/products/engineer-boot.webp", width: 900, height: 1200, alt: "Pair of black leather engineer boots laid flat on concrete" } },
  { slug: "slouch-boot", name: "Slouch Boot", category: "footwear", price: 340, stock: 6, description: "A pointed-toe leather boot with a fold-over shaft that slouches or stands tall.", image: { src: "/images/products/slouch-boot.webp", width: 900, height: 1300, alt: "Black leather slouch boot with pointed toe on a pale ground" } },
];

const accessories: ProductSeed[] = [
  { slug: "minimal-watch", name: "Minimal Watch", category: "accessories", price: 210, stock: 30, description: "A 38mm stainless case with a matte black dial and a slim leather strap. Quartz movement.", image: { src: "/images/products/minimal-watch.webp", width: 900, height: 1125, alt: "Minimal watch with black leather strap on a dark ground" } },
  { slug: "round-shades", name: "Round Shades", category: "accessories", price: 95, stock: 25, description: "Browline sunglasses with a thin metal bridge and gradient lenses. UV400 protection.", image: { src: "/images/products/round-shades.webp", width: 900, height: 1375, alt: "Black framed sunglasses on a white surface" } },
  { slug: "leather-backpack", name: "Leather Backpack", category: "accessories", price: 430, stock: 3, description: "A buckled roll-top backpack in smooth black leather with a padded back and an inner laptop sleeve.", image: { src: "/images/products/leather-backpack.webp", width: 900, height: 1350, alt: "Black leather backpack on a white pedestal" } },
  { slug: "wrap-shades", name: "Wrap Shades", category: "accessories", price: 120, badge: "New", stock: 14, description: "A matte wraparound frame with dark, polarised lenses. Light and secure.", image: { src: "/images/products/wrap-shades.webp", width: 900, height: 720, alt: "Black wraparound sunglasses on a white background" } },
];

// Fixed anchor so re-seeding is deterministic.
const BASE = Date.UTC(2026, 0, 1);
const daysAgo = (days: number) => new Date(BASE - days * 86_400_000);

// New arrivals = newest 8 by created_at (index 0 newest). Best sellers sit 30+ days
// back, descending. The accessories section lists the oldest accessories first, so
// the items already shown under New arrivals (structured-tote) do not repeat.
const dated: { product: ProductSeed; createdAt: Date; isBestSeller: boolean }[] = [
  ...newArrivals.map((product, i) => ({ product, createdAt: daysAgo(i), isBestSeller: false })),
  ...bestSellers.map((product, i) => ({ product, createdAt: daysAgo(30 + i), isBestSeller: true })),
  ...accessories.map((product, i) => ({ product, createdAt: daysAgo(63 - i), isBestSeller: false })),
];

async function main() {
  // drizzle-kit reads .env; Next reads .env.local. Accept either.
  config({ path: ".env.local" });
  config();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  // Imported after env is loaded: src/db/index.ts reads DATABASE_URL at module load.
  const { db } = await import("./index");
  const { categories, products, stock } = await import("./schema");

  await db
    .insert(categories)
    .values(
      categorySeed.map((c) => ({
        slug: c.slug,
        name: c.name,
        imageSrc: c.image?.src ?? null,
        imageWidth: c.image?.width ?? null,
        imageHeight: c.image?.height ?? null,
        imageAlt: c.image?.alt ?? null,
        sortOrder: c.sortOrder,
        showOnHome: c.showOnHome,
      })),
    )
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: sql`excluded.name`,
        imageSrc: sql`excluded.image_src`,
        imageWidth: sql`excluded.image_width`,
        imageHeight: sql`excluded.image_height`,
        imageAlt: sql`excluded.image_alt`,
        sortOrder: sql`excluded.sort_order`,
        showOnHome: sql`excluded.show_on_home`,
      },
    });

  const categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));

  const insertedProducts = await db
    .insert(products)
    .values(
      dated.map(({ product: p, createdAt, isBestSeller }) => {
        const catId = categoryId.get(p.category);
        if (catId === undefined) throw new Error(`Unknown category "${p.category}" for ${p.slug}`);
        return {
          slug: p.slug,
          name: p.name,
          description: p.description,
          categoryId: catId,
          priceCents: p.price * 100,
          currency: "USD",
          badge: p.badge ?? null,
          imageSrc: p.image.src,
          imageWidth: p.image.width,
          imageHeight: p.image.height,
          imageAlt: p.image.alt,
          sizes: sizesByCategory[p.category] ?? [],
          isBestSeller,
          createdAt,
        };
      }),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        categoryId: sql`excluded.category_id`,
        priceCents: sql`excluded.price_cents`,
        currency: sql`excluded.currency`,
        badge: sql`excluded.badge`,
        imageSrc: sql`excluded.image_src`,
        imageWidth: sql`excluded.image_width`,
        imageHeight: sql`excluded.image_height`,
        imageAlt: sql`excluded.image_alt`,
        sizes: sql`excluded.sizes`,
        isBestSeller: sql`excluded.is_best_seller`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });

  const stockBySlug = new Map(dated.map(({ product }) => [product.slug, product.stock]));
  await db
    .insert(stock)
    .values(insertedProducts.map((p) => ({ productId: p.id, quantity: stockBySlug.get(p.slug) ?? 0 })))
    .onConflictDoNothing({ target: stock.productId });

  console.log(
    `Seeded ${categorySeed.length} categories, ${insertedProducts.length} products, stock rows ensured.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
