import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL_EXTERNAL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_EXTERNAL or DATABASE_URL must be set. Did you forget to add the database integration?",
  );
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });
