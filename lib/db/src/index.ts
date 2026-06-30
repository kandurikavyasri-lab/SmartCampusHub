import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getDatabaseUrl, loadWorkspaceEnv } from "./loadEnv";

loadWorkspaceEnv();

const databaseUrl = getDatabaseUrl();

const { Pool } = pg;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Add it to .env or set it in your deployment environment.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
