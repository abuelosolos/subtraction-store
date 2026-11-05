// Generates the values for the admin login. Run:
//   npx tsx scripts/admin-password.ts '<password, 12+ characters>'
// Then put the two lines in .env.local and in your host's env vars.
import { randomBytes } from "node:crypto";

import { hashPassword } from "../src/lib/admin-auth";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: tsx scripts/admin-password.ts '<password, 12+ characters>'");
  process.exit(1);
}
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
