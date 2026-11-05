import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";

// Vercel preview URLs change per deployment, so unless BETTER_AUTH_URL pins a
// single origin (production), accept the request host from an allow-list.
const customHost = process.env.APP_URL?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
const dynamicBaseURL = {
  allowedHosts: ["*.vercel.app", "localhost:3000", ...(customHost ? [customHost] : [])],
  protocol: process.env.NODE_ENV === "production" ? ("https" as const) : ("http" as const),
};

export const auth = betterAuth({
  ...(process.env.BETTER_AUTH_URL ? {} : { baseURL: dynamicBaseURL }),
  database: drizzleAdapter(db, { provider: "pg" }),
  // Admin access is the signed cookie in src/lib/admin-auth.ts. Better Auth is
  // kept only for its schema; nobody can register or sign in through it.
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      // Contact number, E.164. `input: false` so clients cannot set it through
      // Better Auth's own endpoints; only the validated server action writes it.
      phone: { type: "string", required: false, input: false },
      // "user" | "admin". Never client-settable; the owner row is upserted at admin login.
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  // nextCookies must be the last plugin.
  plugins: [nextCookies()],
});
