// Catalogue types and pure helpers. Product, category and stock data come from
// Postgres via src/lib/catalog-queries.ts; the lookbook is static editorial imagery.

export type Image = { src: string; width: number; height: number; alt: string };

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
  /** Units available. 0 = sold out. */
  stock: number;
  description: string;
  /** Empty means one size. */
  sizes: string[];
  gender: Gender;
  color: string;
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
