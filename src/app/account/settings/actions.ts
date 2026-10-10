"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { profileSchema } from "@/lib/customer";
import { getSessionUser } from "@/lib/session";

export type ProfileActionResult =
  | { ok: true; name: string; phone: string | null }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

/** Update the signed-in user's name and phone. The id comes from the session only. */
export async function updateProfileAction(raw: unknown): Promise<ProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
    }
    return { ok: false, reason: "validation", fieldErrors };
  }

  await db
    .update(userTable)
    .set({ name: parsed.data.name, phone: parsed.data.phone })
    .where(eq(userTable.id, user.id));

  return { ok: true, ...parsed.data };
}
