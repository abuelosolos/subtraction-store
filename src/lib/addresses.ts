import { and, count, desc, eq, sql } from "drizzle-orm";

import { addresses } from "@/db/schema";
import type { Db } from "@/lib/order-lifecycle";
import { pgErrorCode } from "@/lib/order-lifecycle";

export const MAX_SAVED_ADDRESSES = 10;

export type SavedAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

/** Validated address fields (see `deliverySchema`) plus an optional label. */
export type AddressInput = {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
};

export type AddressResult =
  | { ok: true; address: SavedAddress }
  | { ok: false; reason: "not_found" | "limit_reached" };

const columns = {
  id: addresses.id,
  label: addresses.label,
  recipientName: addresses.recipientName,
  phone: addresses.phone,
  line1: addresses.line1,
  line2: addresses.line2,
  city: addresses.city,
  region: addresses.region,
  postalCode: addresses.postalCode,
  country: addresses.country,
  isDefault: addresses.isDefault,
};

const values = (input: AddressInput) => ({
  label: input.label || null,
  recipientName: input.fullName,
  phone: input.phone,
  line1: input.line1,
  line2: input.line2 || null,
  city: input.city,
  region: input.region || null,
  postalCode: input.postalCode || null,
  country: input.country,
});

// Every function below takes the SESSION user's id and puts `user_id = $user`
// in every statement, so another user's address id is simply "not found".

export async function getSavedAddresses(db: Db, userId: string): Promise<SavedAddress[]> {
  return db
    .select(columns)
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function createAddress(
  db: Db,
  userId: string,
  input: AddressInput,
  opts: { makeDefault?: boolean } = {},
): Promise<AddressResult> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(addresses)
    .where(eq(addresses.userId, userId));
  if (n >= MAX_SAVED_ADDRESSES) return { ok: false, reason: "limit_reached" };

  const insert = (isDefault: boolean) =>
    db
      .insert(addresses)
      .values({ userId, ...values(input), isDefault })
      .returning(columns);

  let row;
  try {
    [row] = await insert(n === 0);
  } catch (err) {
    // Two first addresses at once: the one-default index rejects the loser's flag.
    if (pgErrorCode(err) !== "23505") throw err;
    [row] = await insert(false);
  }

  if (opts.makeDefault && !row.isDefault) {
    return setDefaultAddress(db, userId, row.id);
  }
  return { ok: true, address: row };
}

export async function updateAddress(
  db: Db,
  userId: string,
  id: string,
  input: AddressInput,
): Promise<AddressResult> {
  const [row] = await db
    .update(addresses)
    .set({ ...values(input), updatedAt: sql`now()` })
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning(columns);
  return row ? { ok: true, address: row } : { ok: false, reason: "not_found" };
}

/** Atomic switch: clear the current default, set the new one, in one transaction. */
export async function setDefaultAddress(
  db: Db,
  userId: string,
  id: string,
): Promise<AddressResult> {
  const [owned] = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .limit(1);
  if (!owned) return { ok: false, reason: "not_found" };

  const [, [row]] = await db.batch([
    db
      .update(addresses)
      .set({ isDefault: false, updatedAt: sql`now()` })
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true))),
    db
      .update(addresses)
      .set({ isDefault: true, updatedAt: sql`now()` })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning(columns),
  ]);
  return row ? { ok: true, address: row } : { ok: false, reason: "not_found" };
}

/** Deletes an address; if it was the default, the newest remaining one is promoted. */
export async function deleteAddress(
  db: Db,
  userId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const [existing] = await db
    .select({ id: addresses.id, isDefault: addresses.isDefault })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .limit(1);
  if (!existing) return { ok: false, reason: "not_found" };

  const remove = db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));

  if (!existing.isDefault) {
    await remove;
    return { ok: true };
  }

  await db.batch([
    remove,
    db
      .update(addresses)
      .set({ isDefault: true, updatedAt: sql`now()` })
      .where(
        sql`${addresses.id} = (
          select a.id from addresses a
          where a.user_id = ${userId} and a.id <> ${id}
          order by a.created_at desc limit 1
        )`,
      ),
  ]);
  return { ok: true };
}
