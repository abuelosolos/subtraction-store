import { adminAudit } from "@/db/schema";
import type { Db } from "@/lib/order-lifecycle";

export type AuditEntry = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string | number;
  detail?: Record<string, unknown>;
};

/** A prepared insert, so callers can include it in the same `db.batch` as the change. */
export function auditInsert(db: Db, entry: AuditEntry) {
  return db.insert(adminAudit).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: String(entry.targetId),
    detail: entry.detail ?? null,
  });
}
