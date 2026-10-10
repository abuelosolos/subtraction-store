import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      // Contact number, E.164. `input: false` so clients cannot set it through
      // Better Auth's own endpoints; only the validated server action writes it.
      phone: { type: "string", required: false, input: false },
    },
  },
  // nextCookies must be the last plugin.
  plugins: [nextCookies()],
});
