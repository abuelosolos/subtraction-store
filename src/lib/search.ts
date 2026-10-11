// DB-free search over the lightweight catalogue index used by the navbar.

export type SearchItem = {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  currency: string;
  stock: number;
  image: { src: string; width: number; height: number; alt: string };
};

export const MAX_SEARCH_RESULTS = 50;

/** Lowercase, and turn every run of non-letters/numbers into one space. */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** The token itself, minus a trailing "s", minus a trailing "es" (simple plurals). */
const variants = (token: string): string[] => {
  const out = [token];
  if (token.length > 3 && token.endsWith("es")) out.push(token.slice(0, -2));
  if (token.length > 2 && token.endsWith("s")) out.push(token.slice(0, -1));
  return out;
};

/**
 * Case-insensitive and punctuation-insensitive ("tshirt" and "t shirt" find
 * "T-shirts"). Every whitespace-separated token must match, as itself or as a
 * simple singular, somewhere in the name or category (also with spaces
 * removed). Name-prefix matches rank first, then name matches, then
 * category-only matches; ties keep the index order. Plain substring checks, so
 * regex characters are never special. An empty or punctuation-only query
 * returns nothing.
 */
export function searchProducts(index: readonly SearchItem[], query: string): SearchItem[] {
  const q = normalise(query);
  if (!q) return [];
  const tokens = q.split(" ");

  const matchesIn = (text: string, squashed: string, token: string) =>
    variants(token).some((v) => text.includes(v) || squashed.includes(v));

  const scored: { item: SearchItem; score: number; order: number }[] = [];
  index.forEach((item, order) => {
    const name = normalise(item.name);
    const category = normalise(item.category);
    const all = `${name} ${category}`;
    const allSquashed = all.replace(/ /g, "");
    if (!tokens.every((t) => matchesIn(all, allSquashed, t))) return;

    const nameSquashed = name.replace(/ /g, "");
    let score = 2;
    if (name.startsWith(q) || nameSquashed.startsWith(q.replace(/ /g, ""))) score = 0;
    else if (tokens.every((t) => matchesIn(name, nameSquashed, t))) score = 1;
    scored.push({ item, score, order });
  });

  return scored
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, MAX_SEARCH_RESULTS)
    .map((s) => s.item);
}
