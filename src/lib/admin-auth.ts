import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Single-owner admin auth primitives. Pure functions (no Next imports) so they
 * can be unit tested. The password lives in the environment only as a scrypt
 * hash (`ADMIN_PASSWORD_HASH`); sessions are HMAC-signed cookies keyed by
 * `ADMIN_SESSION_SECRET` plus the password hash, so changing the password
 * invalidates every existing session.
 */

export const ADMIN_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Fixed id of the one admin. Upserted into `user` on login so FKs/audit rows resolve. */
export const OWNER_ID = "owner";
export const OWNER_EMAIL = "owner@subtraction.invalid";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

/** `scrypt:<salt hex>:<hash hex>`. Colons, not `$`, so env expansion can't mangle it. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== SCRYPT.keylen) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), SCRYPT.keylen, SCRYPT);
  return timingSafeEqual(actual, expected);
}

function key(secret: string, passwordHash: string) {
  return `${secret}|${passwordHash}`;
}

function mac(value: string, secret: string, passwordHash: string) {
  return createHmac("sha256", key(secret, passwordHash)).update(value).digest("hex");
}

/** Cookie value: `<expiry unix seconds>.<hmac>`. */
export function signSession(
  secret: string,
  passwordHash: string,
  now = Date.now(),
  ttlSeconds = SESSION_TTL_SECONDS,
): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${exp}.${mac(`v1.${exp}`, secret, passwordHash)}`;
}

export function verifySession(
  token: string | undefined | null,
  secret: string | undefined,
  passwordHash: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || !secret || !passwordHash) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d{1,12}$/.test(expStr)) return false;
  if (Number(expStr) * 1000 <= now) return false;
  const expected = Buffer.from(mac(`v1.${expStr}`, secret, passwordHash), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Reads the env once. Returns null when admin auth isn't configured (fail closed). */
export function adminEnv(): { secret: string; passwordHash: string } | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!secret || secret.length < 32 || !passwordHash) return null;
  return { secret, passwordHash };
}

/**
 * Failed-attempt limiter, per key (client IP). In-memory, so on serverless it
 * is per-instance: a speed bump on top of scrypt's cost, not a hard guarantee.
 */
export function createLimiter(max = 5, windowMs = 15 * 60 * 1000) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    blocked(id: string, now = Date.now()) {
      const h = hits.get(id);
      if (!h || h.resetAt <= now) return false;
      return h.count >= max;
    },
    fail(id: string, now = Date.now()) {
      const h = hits.get(id);
      if (!h || h.resetAt <= now) hits.set(id, { count: 1, resetAt: now + windowMs });
      else h.count += 1;
    },
    reset(id: string) {
      hits.delete(id);
    },
  };
}
