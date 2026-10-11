// Grant (or revoke) the admin role. Run by a human with DATABASE_URL set:
//   npx tsx scripts/make-admin.ts someone@example.com
//   npx tsx scripts/make-admin.ts someone@example.com --revoke
// The role can only be set here; no endpoint or form can set it.
import { config } from "dotenv";

import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || !email.includes("@")) {
    console.error("Usage: tsx scripts/make-admin.ts <email> [--revoke]");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const role = flag === "--revoke" ? "user" : "admin";
  const sql = neon(url);
  const rows = await sql`
    update "user" set role = ${role}, updated_at = now()
    where lower(email) = lower(${email})
    returning id, email, role
  `;
  if (rows.length === 0) {
    console.error(`No account with email ${email}. Sign up first, then run this again.`);
    process.exit(1);
  }
  console.log(`${rows[0].email} is now "${rows[0].role}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
