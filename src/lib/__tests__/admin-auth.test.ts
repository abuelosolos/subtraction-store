import { describe, expect, it } from "vitest";

import {
  createLimiter,
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
} from "@/lib/admin-auth";

const SECRET = "s".repeat(40);

describe("password hashing", () => {
  it("verifies the right password and rejects others", () => {
    const h = hashPassword("correct horse");
    expect(h.startsWith("scrypt:")).toBe(true);
    expect(h).not.toContain("$");
    expect(verifyPassword("correct horse", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });

  it("rejects missing or malformed hashes", () => {
    expect(verifyPassword("x", undefined)).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "scrypt:zz")).toBe(false);
    expect(verifyPassword("x", "bcrypt:aa:bb")).toBe(false);
  });
});

describe("session cookie", () => {
  const hash = hashPassword("pw");
  const now = 1_700_000_000_000;

  it("accepts a fresh token", () => {
    expect(verifySession(signSession(SECRET, hash, now), SECRET, hash, now + 1000)).toBe(true);
  });

  it("rejects expired tokens", () => {
    const t = signSession(SECRET, hash, now, 60);
    expect(verifySession(t, SECRET, hash, now + 61_000)).toBe(false);
  });

  it("rejects tampered expiry or signature", () => {
    const t = signSession(SECRET, hash, now);
    const [exp, sig] = t.split(".");
    expect(verifySession(`${Number(exp) + 999999}.${sig}`, SECRET, hash, now)).toBe(false);
    expect(verifySession(`${exp}.${sig.replace(/.$/, sig.endsWith("0") ? "1" : "0")}`, SECRET, hash, now)).toBe(false);
    expect(verifySession(`${exp}.`, SECRET, hash, now)).toBe(false);
    expect(verifySession("garbage", SECRET, hash, now)).toBe(false);
  });

  it("is invalidated by a password change or a different secret", () => {
    const t = signSession(SECRET, hash, now);
    expect(verifySession(t, SECRET, hashPassword("other"), now)).toBe(false);
    expect(verifySession(t, "x".repeat(40), hash, now)).toBe(false);
  });

  it("fails closed when env is missing", () => {
    const t = signSession(SECRET, hash, now);
    expect(verifySession(t, undefined, hash, now)).toBe(false);
    expect(verifySession(t, SECRET, undefined, now)).toBe(false);
    expect(verifySession(undefined, SECRET, hash, now)).toBe(false);
  });
});

describe("limiter", () => {
  it("blocks after max failures, then recovers after the window", () => {
    const l = createLimiter(3, 1000);
    for (let i = 0; i < 3; i++) {
      expect(l.blocked("ip", 0)).toBe(false);
      l.fail("ip", 0);
    }
    expect(l.blocked("ip", 500)).toBe(true);
    expect(l.blocked("other", 500)).toBe(false);
    expect(l.blocked("ip", 1001)).toBe(false);
  });

  it("reset clears failures", () => {
    const l = createLimiter(1, 1000);
    l.fail("ip", 0);
    l.reset("ip");
    expect(l.blocked("ip", 1)).toBe(false);
  });
});
