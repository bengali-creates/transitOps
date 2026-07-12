import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Neon HTTP driver is used for stateless serverless queries (edge and node).
 * For interactive transactions (status transitions), use the pooled client
 * exported below, since neon-http does not support multi-statement transactions.
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export type DB = typeof db;
export { schema };
