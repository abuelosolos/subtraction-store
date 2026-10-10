import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Falls back to a placeholder so `next build` can evaluate this module without
// env vars; queries fail until a real DATABASE_URL is set (see .env.example).
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://user:password@localhost/placeholder";

export const db = drizzle(neon(databaseUrl), { schema });
