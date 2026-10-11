# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Next.js (App Router) + TypeScript + Tailwind v4 + Better Auth + Drizzle ORM + Neon Postgres. Storefront, cart/saved, Paystack checkout, orders, account area and an `/admin` back office (orders, products, categories, stock, fulfilment) exist. Not built: confirmation email, refunds, per-size stock.

## Design system

Before building any UI, read `docs/design-system.md` and use the tokens in `src/app/globals.css`
(colours, type, spacing, containers, surface classes). Button styles live only in
`src/styles/buttons.css`; navbar states in `src/styles/navbar.css`. Figma data is saved in
`docs/figma-reference.md`; don't re-query Figma. Do not hardcode hex values, font sizes or button styling in pages.
Image needs are tracked in `docs/image-manifest.md` and `docs/image-credits.md`.

## Commands

```bash
npm run dev          # next dev
npm run build        # next build (works without env vars, see db note below)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run db:generate  # drizzle-kit generate (SQL migrations -> ./drizzle)
npm run db:migrate   # drizzle-kit migrate
npm run db:push      # drizzle-kit push (sync schema directly, no migration files)
```

`drizzle-kit studio` is intentionally not exposed as a script: its local server has no authentication and allows any browser origin, so a web page could run SQL against the connected database (CWE-942). Inspect data with the Neon console or `psql` instead.

Tests: `npm test` (vitest). DB-backed tests run only when `TEST_DATABASE_URL` points at a Neon branch (they refuse the main database). Setup: `cp .env.example .env.local` and fill in `DATABASE_URL` (Neon) and `BETTER_AUTH_SECRET`.

## Next.js version caveat

This is Next 16.x with breaking changes from older versions. `AGENTS.md` (managed by `next dev`) says to consult `node_modules/next/dist/docs/` before writing Next-specific code. `LayoutProps`/route types are generated globals; run `npx next typegen` if `tsc` can't find them (e.g. after deleting `.next`).

## Architecture

- `src/db/index.ts` — single Drizzle client over `@neondatabase/serverless` (HTTP driver, `drizzle-orm/neon-http`). Falls back to a placeholder URL when `DATABASE_URL` is unset so `next build` can evaluate the module; queries only work with a real URL.
- `src/db/schema.ts` — schema entry point, currently empty. `drizzle.config.ts` reads it (and `.env` via `dotenv/config`) and writes migrations to `./drizzle`. Note drizzle-kit loads `.env`, not `.env.local`.
- `src/lib/auth.ts` — Better Auth server instance using `drizzleAdapter(db, { provider: "pg" })`, email/password enabled. `nextCookies()` must stay the last plugin.
- `src/lib/auth-client.ts` — Better Auth React client for client components.
- `src/app/api/auth/[...all]/route.ts` — mounts the Better Auth handler via `toNextJsHandler`.

## Database conventions

Catalogue tables are `categories`, `products`, `stock` (`src/db/catalog-schema.ts`, re-exported from `src/db/schema.ts`). Carts, orders, payments, reviews, wishlists and variants are deliberately not modelled yet.

- **Money is integer minor units**: `price_cents` + `currency` (default `USD`). Format only at display time with `formatPrice(cents, currency)` from `src/lib/catalog.ts`.
- **Stock is a separate 1:1 `stock` table** (`product_id` PK, `quantity >= 0`), not a column on `products`. Every product has a stock row. Never decrement with read-then-write; use one conditional `UPDATE stock SET quantity = quantity - n WHERE product_id = ? AND quantity >= n` (neon-http has no interactive transactions).
- **Categories are flat**: each product has exactly one `category_id` (FK, `ON DELETE RESTRICT`). Homepage tiles are categories with `show_on_home`, ordered by `sort_order`.
- **Homepage lists come from data, not hardcoded arrays**: New arrivals = newest by `created_at`; Best sellers = `is_best_seller`; Accessories = category slug `accessories`.
- **`products.sizes` is display-only** (`text[]`, empty = one size). Per-size stock needs real variants, which don't exist yet.
- **Reads live in `src/lib/catalog-queries.ts`**, each with `"use cache"` + `cacheTag("catalog")` + `cacheLife`, all returning the shared `Product` type from `src/lib/catalog.ts` (which stays DB-free). After any write to catalogue or stock, invalidate the `catalog` tag.
- **Migrations are versioned**: change the schema, then `db:generate`, review the SQL in `./drizzle`, then `db:migrate`. Don't use `db:push` against the shared database.
- **`npm run db:seed` is idempotent and insert-only**: it never overwrites existing categories, products or stock, so admin edits and archives survive a reseed.
- **Builds need `DATABASE_URL`** for the home and `/products/[slug]` routes, since cached queries and `generateStaticParams` hit the DB at build time.

Better Auth's own tables (user/session/account/verification) are not defined yet. Generate them with `npx @better-auth/cli generate`, put them in/re-export from `src/db/schema.ts`, then run `db:generate` + `db:migrate`; the auth routes will not work until this is done.

## Admin conventions

- **Access**: `user.role` (`"user"` | `"admin"`, `input:false` so no client can set it). Grant with `npx tsx scripts/make-admin.ts <email>`. Every admin page wraps content in `<AdminGate>` (`requireAdmin`) inside `<Suspense>`; every admin server action and API route must call `getAdminUser()` itself (actions are public POST endpoints). Never put admin data in `"use cache"`.
- **Data layer**: `src/lib/admin/*` takes `db` and the actor; actions are thin. Writes that need an audit row use a single-statement CTE (or one `db.batch`) so the change and its `admin_audit` / `stock_adjustments` row are atomic.
- **Never hand-set** order `status` to paid/expired/failed/pending/payment_mismatch: only `confirmPayment` / `releaseOrder` move it. Admin sets `fulfilment_status` (only valid when paid, enforced by a CHECK) and can re-check a payment.
- **Catalogue**: archive via `products.archived_at` (filtered in `catalog-queries.ts` and `loadPricedProducts`); a slug change keeps the old one in `product_slug_history` so old URLs redirect and old cart/saved/checkout lines still resolve; a product and its stock row are created in one statement; call `invalidateCatalog()` after writes.
- **Images**: client upload to Vercel Blob through `/api/admin/upload` (admin-checked token). Needs `BLOB_READ_WRITE_TOKEN`; existing `/images/...` paths remain valid.
- **Stock**: relative adjustments only (`quantity + delta`), with history in `stock_adjustments`.
