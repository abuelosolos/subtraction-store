import { z } from "zod";

// Validation for customer-supplied delivery details. All of this is server
// side input handling: trim, strip control characters, cap lengths, normalise
// the phone to E.164 and require a real ISO 3166-1 country.

const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

export const COUNTRIES: readonly string[] = COUNTRY_CODES;
const COUNTRY_SET = new Set(COUNTRY_CODES);

export const isCountryCode = (code: string) => COUNTRY_SET.has(code);

/** Country display name for UI (falls back to the code). */
export const countryName = (code: string) =>
  new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;

/** Dial codes only for countries where a national-format number is accepted. */
const NATIONAL_PREFIX: Record<string, { dial: string; trunk: string; length: number }> = {
  NG: { dial: "234", trunk: "0", length: 11 },
};

/**
 * Returns E.164 (`+` and 8 to 15 digits) or null. Accepts `+...`, `00...`, and
 * Nigerian national format (`0803...`) when the delivery country is NG.
 */
export function normalizePhone(raw: string, country?: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  let digits: string;

  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    digits = cleaned.slice(2);
  } else {
    const national = country ? NATIONAL_PREFIX[country] : undefined;
    if (!national || !cleaned.startsWith(national.trunk) || cleaned.length !== national.length) {
      return null;
    }
    digits = national.dial + cleaned.slice(national.trunk.length);
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL_CHARS, "").trim())
    .pipe(z.string().min(min).max(max));

const optionalText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL_CHARS, "").trim())
    .pipe(z.string().max(max))
    .optional()
    .transform((s) => (s ? s : undefined));

export const deliverySchema = z
  .object({
    fullName: text(2, 100),
    phone: z.string().max(40),
    line1: text(3, 200),
    line2: optionalText(200),
    city: text(2, 100),
    region: optionalText(100),
    postalCode: optionalText(20),
    country: z
      .string()
      .transform((s) => s.trim().toUpperCase())
      .refine(isCountryCode, "Select a country"),
  })
  .transform((value, ctx) => {
    const phone = normalizePhone(value.phone, value.country);
    if (!phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number" });
      return z.NEVER;
    }
    return { ...value, phone };
  });

export type DeliveryDetails = z.output<typeof deliverySchema>;

/** Account profile: name plus an optional contact number (stored as E.164). */
export const profileSchema = z
  .object({
    name: text(2, 100),
    phone: z
      .string()
      .max(40)
      .optional()
      .transform((s) => (s ?? "").replace(CONTROL_CHARS, "").trim()),
  })
  .transform((value, ctx) => {
    if (!value.phone) return { name: value.name, phone: null };
    // The store ships to Nigeria first, so national-format numbers are read as NG.
    const phone = normalizePhone(value.phone, "NG");
    if (!phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number" });
      return z.NEVER;
    }
    return { name: value.name, phone };
  });

export type ProfileInput = z.output<typeof profileSchema>;

export const cartLineSchema = z.object({
  slug: z.string().min(1).max(100),
  size: z.string().max(20).nullish(),
  quantity: z.number(),
});

export const checkoutInputSchema = z
  .object({
    lines: z.array(cartLineSchema).max(50),
    /** Use one of the signed-in user's saved addresses (looked up server-side). */
    savedAddressId: z.uuid().optional(),
    details: deliverySchema.optional(),
    saveAddress: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.savedAddressId) !== Boolean(v.details), {
    message: "Provide either a saved address or delivery details",
    path: ["details"],
  });

export type CheckoutInput = z.output<typeof checkoutInputSchema>;
