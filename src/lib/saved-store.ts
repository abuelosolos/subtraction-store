import { createLocalStore } from "@/lib/local-store";

/** Saved items: product slugs only. Device-local until wishlists are modelled in the DB. */
const MAX_SAVED = 50;
const EMPTY: string[] = [];

function parse(raw: unknown): string[] {
  if (!Array.isArray(raw)) return EMPTY;
  const slugs = raw.filter(
    (s): s is string => typeof s === "string" && s.length > 0 && s.length <= 100,
  );
  return [...new Set(slugs)].slice(0, MAX_SAVED);
}

const store = createLocalStore<string[]>("subtraction.saved.v1", EMPTY, parse);

export const useSaved = store.useStore;

export function toggleSaved(slug: string) {
  const slugs = store.read();
  if (slugs.includes(slug)) store.write(slugs.filter((s) => s !== slug));
  else store.write([slug, ...slugs].slice(0, MAX_SAVED));
}

export function removeSaved(slug: string) {
  store.write(store.read().filter((s) => s !== slug));
}
