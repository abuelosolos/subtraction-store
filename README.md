# SUBTRACTION.

A dark, minimalist fashion storefront with its own admin back office. **This is a portfolio project**: a real, working shop front-end and catalogue, built to show full-stack skills rather than to take orders.

## What it is

- **Storefront**: home page, collections, categories, product pages with photo galleries, search, cart and saved items.
- **Admin back office** (`/admin`): manage products and their photos, categories, stock and orders. Works on phone (bottom nav) and desktop (sidebar).
- **Single-owner admin login**: one password, no user accounts.

## What is not available

This is a demo, so these are switched off or not built:

| Not available | Detail |
| --- | --- |
| Customer sign-in and registration | Removed. Shoppers browse without an account. |
| Checkout and payments | The cart's Checkout button is disabled. |
| Orders and account area | Removed from the storefront. |
| Editing page content in admin | Home, story, lookbook, nav and footer text are fixed in code for now. |
| Per-size stock | Sizes are display-only; stock is per product. |
| Reviews, wishlists, product variants | Not built. |
| Video uploads | The admin uploads images only. |

`/login` exists only so the owner can reach `/admin`. It is not linked from the shop.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Neon Postgres with Drizzle ORM |
| Image storage | Vercel Blob |
| Validation | Zod |
| Tests and checks | Vitest, ESLint, `tsc` |

## Dependencies

**Runtime**

- `next`, `react`, `react-dom`
- `drizzle-orm`, `@neondatabase/serverless`
- `@vercel/blob`
- `better-auth` (kept for its database schema; sign-up is disabled)
- `zod`

**Development**

- `typescript`, `eslint`, `eslint-config-next`
- `tailwindcss`, `@tailwindcss/turbopack`
- `drizzle-kit`, `tsx`, `dotenv`
- `vitest`

## Run it locally

You need Node.js and a Neon Postgres database.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run db:migrate           # create the tables
npm run db:seed              # add sample products (safe to re-run)
npm run dev                  # http://localhost:3000
```

### Environment variables

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Random secret for the auth library |
| `ADMIN_PASSWORD_HASH` | Hash of the admin password |
| `ADMIN_SESSION_SECRET` | Random secret that signs the admin cookie |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token, needed for image uploads |

Create the two admin values with:

```bash
npx tsx scripts/admin-password.ts 'choose-a-long-password'
```

Put the printed lines in `.env.local` and in your host's environment settings. Never commit `.env.local`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the code |
| `npm run typecheck` | Check types |
| `npm test` | Run tests (database tests need `TEST_DATABASE_URL` pointing at a Neon test branch) |
| `npm run db:generate` / `db:migrate` | Create and apply migrations |
| `npm run db:seed` | Insert sample data without overwriting existing rows |

## Project notes

- Design rules are in `docs/design-system.md`; image sources and licences are in `docs/image-credits.md`.
- Prices are stored as integer minor units (kobo) and shown in NGN.
