import { revalidateTag } from "next/cache";

/**
 * Stock changed (reserve, release, late payment): drop cached catalogue reads.
 * `expire: 0` so the next request does not serve stale stock numbers. Works in
 * Server Actions and Route Handlers.
 */
export function invalidateCatalog() {
  revalidateTag("catalog", { expire: 0 });
}
