// Catalogue types and pure helpers. Product, category and stock data come from
// Postgres via src/lib/catalog-queries.ts; the lookbook is static editorial imagery.

export type Image = { src: string; width: number; height: number; alt: string };

/** One photo of a product; `kind` is front | side | back | item. */
export type GalleryImage = Image & { kind: string };

export type Gender = "men" | "women" | "unisex";

export type Product = {
  slug: string;
  name: string;
  /** Category display name. */
  category: string;
  categorySlug: string;
  /** Minor units (cents) in `currency`. */
  priceCents: number;
  currency: string;
  badge?: string;
  image: Image;
  /** Extra angles (front, side, back, cut-out), product page only. Empty/absent = just `image`. */
  gallery?: GalleryImage[];
  /** Units available. 0 = sold out. */
  stock: number;
  description: string;
  /** Empty means one size. */
  sizes: string[];
  gender: Gender;
  color: string;
  isBestSeller: boolean;
  /** Free-text collection label, when the product belongs to one. */
  collection?: string;
};

export type HomeCategory = { label: string; href: string; image: Image };

export type StockState = "in-stock" | "low-stock" | "sold-out";

export const LOW_STOCK_THRESHOLD = 5;

export const stockState = (stock: number): StockState =>
  stock <= 0 ? "sold-out" : stock <= LOW_STOCK_THRESHOLD ? "low-stock" : "in-stock";

export const lookbook = [
  { src: "/images/lookbook/01.webp", width: 1000, height: 750, alt: "Black silhouette of an oversized coat against white" },
  { src: "/images/lookbook/02.webp", width: 1000, height: 1250, alt: "Black and white shot of a grey blazer and black trousers" },
  { src: "/images/lookbook/03.webp", width: 1000, height: 1550, alt: "Figure in a black hoodie covering their face in the dark" },
  { src: "/images/lookbook/04.webp", width: 1000, height: 1500, alt: "Black and white portrait of a man in a light sweater" },
];

/** Whole amounts show no decimals ($420); fractional amounts show cents ($19.99). */
export const formatPrice = (cents: number, currency = "USD") =>
  new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

const CARD_ORDER = ["side", "front", "back", "item"];

/**
 * Photos a product card cycles through: side (shown at rest), front, back, item.
 * Unknown kinds go last; falls back to the single card image.
 */
export function cardImages(product: Pick<Product, "image" | "gallery">): Image[] {
  const rank = (kind: string) => {
    const i = CARD_ORDER.indexOf(kind);
    return i === -1 ? CARD_ORDER.length : i;
  };
  const list = [...(product.gallery ?? [])].sort((a, b) => rank(a.kind) - rank(b.kind));
  if (list.length === 0) return [product.image];
  // The first photo must be the one the card shows at rest.
  const restAt = list.findIndex((g) => g.src === product.image.src);
  if (restAt > 0) list.unshift(...list.splice(restAt, 1));
  return list;
}
