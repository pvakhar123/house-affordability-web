import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Feature flag: is the database configured?
export const isDbAvailable = !!process.env.POSTGRES_URL;

// Lazy singleton — only connect when actually needed
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL is not set");
    }
    const sql = neon(process.env.POSTGRES_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
