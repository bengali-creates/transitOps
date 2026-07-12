import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Transaction-capable client. Use this ONLY inside service functions that need
 * atomic multi-table writes, for example dispatching a trip (trip + vehicle +
 * driver + status_history in one transaction). Everywhere else use `db`.
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const txDb = drizzle(pool, { schema });
export { pool };
