import { and, asc, desc, eq, ilike, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { adminAudit, categories, products, stock } from "@/db/schema";
import { pgErrorCode, type Db } from "@/lib/order-lifecycle";

const CONTROL = /[\u0000-\u001F\u007F]/g;
const clean = (s: string) => s.replace(CONTROL, "").trim();

const text = (min: number, max: number) =>
  z.string().transform(clean).pipe(z.string().min(min).max(max));
const optionalText = (max: number) =>
  z
    .string()
    .transform(clean)
    .pipe(z.string().max(max))
    .optional()
    .transform((s) => s || null);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugSchema = z.string().transform((s) => s.trim().toLowerCase()).pipe(
  z.string().min(2).max(80).regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens"),
);

/** Whole-naira form input to integer kobo. Max ₦1,000,000, at most 2 decimals. */
export const MAX_PRICE_KOBO = 100_000_000;
export function nairaToKobo(raw: string): number | null {
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(raw.trim().replace(/,/g, ""));
  if (!m) return null;
  const kobo = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return kobo >= 0 && kobo <= MAX_PRICE_KOBO ? kobo : null;
}

/** Local `/images/...` path or an https Vercel Blob URL. Nothing else is stored. */
export function isAllowedImageSrc(src: string): boolean {
  if (src.startsWith("/")) {
    return !src.startsWith("//") && !src.includes("..") && /^\/[\w\-./%]+$/.test(src);
  }
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const imageFields = {
  imageSrc: z.string().transform(clean).pipe(
    z.string().min(1).max(500).refine(isAllowedImageSrc, "Upload an image or use a /images/... path"),
  ),
  imageWidth: z.coerce.number().int().min(1).max(10_000),
  imageHeight: z.coerce.number().int().min(1).max(10_000),
  imageAlt: text(1, 200),
};

const sizesSchema = z
  .string()
  .optional()
  .transform((s) =>
    [...new Set((s ?? "").split(",").map(clean).filter(Boolean))],
  )
  .pipe(z.array(z.string().max(10)).max(12));

const priceSchema = z
  .string()
  .transform((s, ctx) => {
    const kobo = nairaToKobo(s);
    if (kobo === null) {
      ctx.addIssue({ code: "custom", message: "Enter a price in naira, up to ₦1,000,000" });
      return z.NEVER;
    }
    return kobo;
  });

export const GENDERS = ["men", "women", "unisex"] as const;

export const productInputSchema = z.object({
  name: text(2, 120),
  gender: z.enum(GENDERS),
  color: text(1, 30),
  collection: optionalText(60),
  description: z.string().transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()).pipe(z.string().max(2000)),
  categoryId: z.coerce.number().int().positive(),
  price: priceSchema,
  sizes: sizesSchema,
  badge: optionalText(30),
  isBestSeller: z.boolean().default(false),
  ...imageFields,
});
export type ProductInput = z.output<typeof productInputSchema>;

/** Update: the slug is optional; sending a different one renames the address and keeps the old one as a redirect. */
export const productUpdateSchema = productInputSchema.extend({ slug: slugSchema.optional() });
export type ProductUpdateInput = z.output<typeof productUpdateSchema>;

export const productNameSchema = text(2, 120);

export const productCreateSchema = productInputSchema.extend({
  slug: slugSchema,
  initialStock: z.coerce.number().int().min(0).max(100_000),
});
export type ProductCreateInput = z.output<typeof productCreateSchema>;

export const categoryInputSchema = z
  .object({
    name: text(2, 80),
    sortOrder: z.coerce.number().int().min(-1000).max(1000),
    showOnHome: z.boolean().default(false),
    imageSrc: z.string().transform(clean).optional(),
    imageWidth: z.coerce.number().int().min(1).max(10_000).optional(),
    imageHeight: z.coerce.number().int().min(1).max(10_000).optional(),
    imageAlt: optionalText(200),
  })
  .transform((v, ctx) => {
    const hasAny = Boolean(v.imageSrc) || v.imageWidth !== undefined || v.imageHeight !== undefined || Boolean(v.imageAlt);
    if (!hasAny) {
      return { ...v, imageSrc: null, imageWidth: null, imageHeight: null, imageAlt: null };
    }
    if (!v.imageSrc || !isAllowedImageSrc(v.imageSrc) || !v.imageWidth || !v.imageHeight || !v.imageAlt) {
      ctx.addIssue({ code: "custom", path: ["imageSrc"], message: "Provide an image, its size and alt text, or leave all empty" });
      return z.NEVER;
    }
    return { ...v, imageSrc: v.imageSrc, imageWidth: v.imageWidth, imageHeight: v.imageHeight, imageAlt: v.imageAlt };
  });
export type CategoryInput = z.output<typeof categoryInputSchema>;

export const categoryCreateSchema = z.object({ slug: slugSchema }).and(categoryInputSchema);

// ---------------------------------------------------------------- reads

export type AdminProductRow = {
  id: number;
  slug: string;
  name: string;
  categoryName: string;
  priceCents: number;
  currency: string;
  quantity: number;
  archivedAt: Date | null;
  isBestSeller: boolean;
  gender: string;
};

export async function listAdminProducts(db: Db, opts: { includeArchived: boolean; q?: string }) {
  const conditions: SQL[] = [];
  if (!opts.includeArchived) conditions.push(isNull(products.archivedAt));
  if (opts.q) conditions.push(ilike(products.name, `%${opts.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      categoryName: categories.name,
      priceCents: products.priceCents,
      currency: products.currency,
      quantity: sql<number>`coalesce(${stock.quantity}, 0)::int`,
      archivedAt: products.archivedAt,
      isBestSeller: products.isBestSeller,
      gender: products.gender,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(stock, eq(stock.productId, products.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt));
  return rows.map((r) => ({ ...r, quantity: Number(r.quantity) })) as AdminProductRow[];
}

export async function getAdminProduct(db: Db, id: number) {
  const [row] = await db
    .select({
      product: products,
      quantity: sql<number>`coalesce(${stock.quantity}, 0)::int`,
    })
    .from(products)
    .leftJoin(stock, eq(stock.productId, products.id))
    .where(eq(products.id, id))
    .limit(1);
  return row ? { ...row.product, quantity: Number(row.quantity) } : null;
}

/** Existing colours and collections, to suggest in the product form. */
export async function listAttributeSuggestions(db: Db) {
  const [colors, collections] = await Promise.all([
    db.selectDistinct({ v: products.color }).from(products).orderBy(asc(products.color)),
    db
      .selectDistinct({ v: products.collection })
      .from(products)
      .where(sql`${products.collection} is not null`)
      .orderBy(asc(products.collection)),
  ]);
  return {
    colors: colors.map((r) => r.v),
    collections: collections.map((r) => r.v).filter((v): v is string => v !== null),
  };
}

export async function listAdminCategories(db: Db) {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
      showOnHome: categories.showOnHome,
      imageSrc: categories.imageSrc,
      imageWidth: categories.imageWidth,
      imageHeight: categories.imageHeight,
      imageAlt: categories.imageAlt,
      productCount: sql<number>`(select count(*) from products p where p.category_id = "categories"."id")::int`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map((r) => ({ ...r, productCount: Number(r.productCount) }));
}

// ---------------------------------------------------------------- writes

type Actor = { id: string };
const PROTECTED_CATEGORY_SLUGS = new Set(["accessories"]);

export type WriteResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; reason: "slug_taken" | "category_not_found" | "not_found" | "in_use" | "protected" };

const sizesSql = (sizes: string[]) =>
  sql`array(select jsonb_array_elements_text(${JSON.stringify(sizes)}::jsonb))`;

/**
 * Product + its stock row + audit entry in ONE statement (atomic on neon-http).
 * A unique or FK violation aborts the whole thing, so no partial product.
 */
export async function createProduct(
  db: Db,
  actor: Actor,
  input: ProductCreateInput,
): Promise<WriteResult<{ slug: string }>> {
  const detail = JSON.stringify({ name: input.name, priceKobo: input.price, initialStock: input.initialStock });
  try {
    await db.execute(sql`
      with p as (
        insert into products
          (slug, name, description, category_id, price_cents, currency, badge,
           image_src, image_width, image_height, image_alt, sizes, is_best_seller,
           gender, color, collection)
        values
          (${input.slug}, ${input.name}, ${input.description}, ${input.categoryId}::int, ${input.price}::int,
           'NGN', ${input.badge}, ${input.imageSrc}, ${input.imageWidth}::int, ${input.imageHeight}::int,
           ${input.imageAlt}, ${sizesSql(input.sizes)}, ${input.isBestSeller},
           ${input.gender}::product_gender, ${input.color}, ${input.collection})
        returning id, slug
      ),
      s as (
        insert into stock (product_id, quantity)
        select id, ${input.initialStock}::int from p
        returning product_id
      ),
      a as (
        insert into admin_audit (actor_user_id, action, target_type, target_id, detail)
        select ${actor.id}, 'product.create', 'product', slug, ${detail}::jsonb from p
        returning id
      )
      select count(*)::int as n from p
    `);
    return { ok: true, slug: input.slug };
  } catch (err) {
    const code = pgErrorCode(err);
    if (code === "23505") return { ok: false, reason: "slug_taken" };
    if (code === "23503") return { ok: false, reason: "category_not_found" };
    throw err;
  }
}

/**
 * Update a product in ONE statement. If `input.slug` differs from the current
 * slug the old one is stored in `product_slug_history` (so old links redirect)
 * and a slug already used by another product, now or in the past, is refused.
 * The audit row is written from the updated row, so a miss logs nothing.
 */
export async function updateProduct(
  db: Db,
  actor: Actor,
  id: number,
  input: ProductUpdateInput,
): Promise<WriteResult & { previousImageSrc?: string }> {
  const detail = JSON.stringify({ name: input.name, priceKobo: input.price });
  const newSlug = input.slug ?? null;
  try {
    if (newSlug) {
      const clash = await db.execute(sql`
        select 1 from product_slug_history where old_slug = ${newSlug} and product_id <> ${id}::int
        union all
        select 1 from products where slug = ${newSlug} and id <> ${id}::int
        limit 1
      `);
      if (clash.rows.length > 0) return { ok: false, reason: "slug_taken" };
    }
    const result = await db.execute(sql`
      with old as (
        select id, slug, image_src from products where id = ${id}::int
      ),
      u as (
        update products
        set slug = coalesce(${newSlug}, slug),
            name = ${input.name}, description = ${input.description},
            category_id = ${input.categoryId}::int, price_cents = ${input.price}::int,
            badge = ${input.badge}, image_src = ${input.imageSrc},
            image_width = ${input.imageWidth}::int, image_height = ${input.imageHeight}::int,
            image_alt = ${input.imageAlt}, sizes = ${sizesSql(input.sizes)},
            is_best_seller = ${input.isBestSeller},
            gender = ${input.gender}::product_gender, color = ${input.color},
            collection = ${input.collection}, updated_at = now()
        where id = ${id}::int
        returning id, slug
      ),
      h as (
        insert into product_slug_history (old_slug, product_id)
        select old.slug, old.id from old join u on u.id = old.id where old.slug <> u.slug
        on conflict (old_slug) do update set product_id = excluded.product_id, changed_at = now()
        returning old_slug
      ),
      d as (
        delete from product_slug_history
        where product_id = ${id}::int and old_slug = ${newSlug}
        returning old_slug
      ),
      a as (
        insert into admin_audit (actor_user_id, action, target_type, target_id, detail)
        select ${actor.id}, 'product.update', 'product', slug,
               (${detail}::jsonb || jsonb_build_object('previousSlug', (select slug from old)))
        from u
        returning id
      )
      select count(*)::int as n, (select image_src from old) as previous_image_src from u
    `);
    const row = result.rows[0] as { n: number; previous_image_src: string | null };
    return Number(row.n) === 1
      ? { ok: true, previousImageSrc: row.previous_image_src ?? undefined }
      : { ok: false, reason: "not_found" };
  } catch (err) {
    const code = pgErrorCode(err);
    if (code === "23503") return { ok: false, reason: "category_not_found" };
    if (code === "23505") return { ok: false, reason: "slug_taken" };
    throw err;
  }
}

/** Rename only: name change plus its own audit row, in one statement. */
export async function renameProduct(
  db: Db,
  actor: Actor,
  id: number,
  name: string,
): Promise<WriteResult> {
  const result = await db.execute(sql`
    with old as (select id, name from products where id = ${id}::int),
    u as (
      update products set name = ${name}, updated_at = now()
      where id = ${id}::int
      returning id, slug
    ),
    a as (
      insert into admin_audit (actor_user_id, action, target_type, target_id, detail)
      select ${actor.id}, 'product.rename', 'product', u.slug,
             jsonb_build_object('from', old.name, 'to', ${name}::text)
      from u join old on old.id = u.id
      returning id
    )
    select count(*)::int as n from u
  `);
  return Number((result.rows[0] as { n: number }).n) === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function setProductArchived(
  db: Db,
  actor: Actor,
  id: number,
  archived: boolean,
): Promise<WriteResult> {
  const action = archived ? "product.archive" : "product.unarchive";
  const result = await db.execute(sql`
    with u as (
      update products
      set archived_at = ${archived ? sql`now()` : sql`null`}, updated_at = now()
      where id = ${id}::int
      returning id, slug
    ),
    a as (
      insert into admin_audit (actor_user_id, action, target_type, target_id)
      select ${actor.id}, ${action}, 'product', slug from u
      returning id
    )
    select count(*)::int as n from u
  `);
  return Number((result.rows[0] as { n: number }).n) === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function createCategory(
  db: Db,
  actor: Actor,
  input: z.output<typeof categoryCreateSchema>,
): Promise<WriteResult<{ slug: string }>> {
  try {
    await db.batch([
      db.insert(categories).values({
        slug: input.slug,
        name: input.name,
        sortOrder: input.sortOrder,
        showOnHome: input.showOnHome,
        imageSrc: input.imageSrc,
        imageWidth: input.imageWidth,
        imageHeight: input.imageHeight,
        imageAlt: input.imageAlt,
      }),
      db.insert(adminAudit).values({
        actorUserId: actor.id,
        action: "category.create",
        targetType: "category",
        targetId: input.slug,
        detail: { name: input.name },
      }),
    ]);
    return { ok: true, slug: input.slug };
  } catch (err) {
    if (pgErrorCode(err) === "23505") return { ok: false, reason: "slug_taken" };
    throw err;
  }
}

export async function updateCategory(
  db: Db,
  actor: Actor,
  id: number,
  input: CategoryInput,
): Promise<WriteResult> {
  const detail = JSON.stringify({ name: input.name });
  const result = await db.execute(sql`
    with u as (
      update categories
      set name = ${input.name}, sort_order = ${input.sortOrder}::int, show_on_home = ${input.showOnHome},
          image_src = ${input.imageSrc}, image_width = ${input.imageWidth}::int,
          image_height = ${input.imageHeight}::int, image_alt = ${input.imageAlt}
      where id = ${id}::int
      returning id, slug
    ),
    a as (
      insert into admin_audit (actor_user_id, action, target_type, target_id, detail)
      select ${actor.id}, 'category.update', 'category', slug, ${detail}::jsonb from u
      returning id
    )
    select count(*)::int as n from u
  `);
  return Number((result.rows[0] as { n: number }).n) === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}

/** Blocked while any product (even archived) uses it, and for hardcoded slugs. */
export async function deleteCategory(db: Db, actor: Actor, id: number): Promise<WriteResult> {
  const [cat] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return { ok: false, reason: "not_found" };
  if (PROTECTED_CATEGORY_SLUGS.has(cat.slug)) return { ok: false, reason: "protected" };
  try {
    await db.batch([
      db.delete(categories).where(eq(categories.id, id)),
      db.insert(adminAudit).values({
        actorUserId: actor.id,
        action: "category.delete",
        targetType: "category",
        targetId: cat.slug,
      }),
    ]);
    return { ok: true };
  } catch (err) {
    // ON DELETE RESTRICT raises 23001 (23503 for NO ACTION): products still
    // reference it, and the whole batch rolled back.
    const code = pgErrorCode(err);
    if (code === "23001" || code === "23503") return { ok: false, reason: "in_use" };
    throw err;
  }
}
