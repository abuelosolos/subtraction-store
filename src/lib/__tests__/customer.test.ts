import { describe, expect, it } from "vitest";

import {
  checkoutInputSchema,
  deliverySchema,
  isCountryCode,
  normalizePhone,
  profileSchema,
} from "@/lib/customer";

describe("normalizePhone", () => {
  it.each([
    ["+234 803 123 4567", "NG", "+2348031234567"],
    ["08031234567", "NG", "+2348031234567"],
    ["0803-123-4567", "NG", "+2348031234567"],
    ["00447911123456", "GB", "+447911123456"],
    ["+1 (415) 555-0132", "US", "+14155550132"],
  ])("normalises %s (%s)", (raw, country, expected) => {
    expect(normalizePhone(raw, country)).toBe(expected);
  });

  it.each([
    ["07911123456", "GB"], // national format only accepted for NG
    ["0803123", "NG"], // too short
    ["+0123456789", "NG"], // leading zero after +
    ["+12345", "US"], // too short
    ["+1234567890123456", "US"], // too long
    ["not a number", "NG"],
    ["", "NG"],
  ])("rejects %s (%s)", (raw, country) => {
    expect(normalizePhone(raw, country)).toBeNull();
  });
});

describe("deliverySchema", () => {
  const valid = {
    fullName: "  Ada Obi ",
    phone: "08031234567",
    line1: "12 Marina Road",
    city: "Lagos",
    country: "ng",
  };

  it("trims, upper-cases the country and normalises the phone", () => {
    const parsed = deliverySchema.parse(valid);
    expect(parsed).toMatchObject({
      fullName: "Ada Obi",
      phone: "+2348031234567",
      country: "NG",
    });
    expect(parsed.line2).toBeUndefined();
  });

  it("strips control characters", () => {
    const parsed = deliverySchema.parse({ ...valid, line1: "12\u0000 Marina\u0007 Road" });
    expect(parsed.line1).toBe("12 Marina Road");
  });

  it("rejects an unknown country, bad phone and missing fields", () => {
    expect(deliverySchema.safeParse({ ...valid, country: "ZZ" }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...valid, country: "Nigeria" }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...valid, line1: "" }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...valid, fullName: "A" }).success).toBe(false);
  });

  it("caps field lengths", () => {
    expect(deliverySchema.safeParse({ ...valid, line1: "x".repeat(201) }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...valid, city: "x".repeat(101) }).success).toBe(false);
  });

  it("knows real ISO codes", () => {
    expect(isCountryCode("NG")).toBe(true);
    expect(isCountryCode("GB")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
  });
});

describe("checkoutInputSchema", () => {
  const lines = [{ slug: "tee", size: null, quantity: 1 }];
  const details = {
    fullName: "Ada Obi",
    phone: "08031234567",
    line1: "12 Marina Road",
    city: "Lagos",
    country: "NG",
  };

  it("accepts details or a saved address id, not both and not neither", () => {
    expect(checkoutInputSchema.safeParse({ lines, details }).success).toBe(true);
    expect(
      checkoutInputSchema.safeParse({
        lines,
        savedAddressId: "5b0f5c0e-6c0e-4f4e-9a0e-0d3f6f6f6f6f",
      }).success,
    ).toBe(true);
    expect(checkoutInputSchema.safeParse({ lines }).success).toBe(false);
    expect(
      checkoutInputSchema.safeParse({
        lines,
        details,
        savedAddressId: "5b0f5c0e-6c0e-4f4e-9a0e-0d3f6f6f6f6f",
      }).success,
    ).toBe(false);
  });

  it("drops unknown keys such as client-supplied prices and status", () => {
    const parsed = checkoutInputSchema.parse({
      lines: [{ slug: "tee", quantity: 1, priceCents: 1, totalKobo: 1 }],
      details,
      totalKobo: 1,
      status: "paid",
    });
    expect(parsed).not.toHaveProperty("totalKobo");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed.lines[0]).not.toHaveProperty("priceCents");
  });

  it("rejects a non-uuid saved address id", () => {
    expect(checkoutInputSchema.safeParse({ lines, savedAddressId: "1 OR 1=1" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("trims the name and normalises a Nigerian national number", () => {
    expect(profileSchema.parse({ name: "  Ada Obi ", phone: "0803 123 4567" })).toEqual({
      name: "Ada Obi",
      phone: "+2348031234567",
    });
  });

  it("allows an empty or missing phone and stores null", () => {
    expect(profileSchema.parse({ name: "Ada Obi", phone: "" }).phone).toBeNull();
    expect(profileSchema.parse({ name: "Ada Obi" }).phone).toBeNull();
  });

  it("rejects a junk phone with a phone-path error", () => {
    const r = profileSchema.safeParse({ name: "Ada Obi", phone: "call me" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["phone"]);
  });

  it("rejects short and over-long names", () => {
    expect(profileSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("ignores unexpected keys", () => {
    expect(profileSchema.parse({ name: "Ada Obi", role: "admin" })).not.toHaveProperty("role");
  });
});
