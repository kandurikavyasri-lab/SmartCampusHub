import { defineConfig } from "drizzle-kit";
import { getMigrationDatabaseUrl, loadWorkspaceEnv } from "./src/loadEnv";

loadWorkspaceEnv();

const databaseUrl = getMigrationDatabaseUrl();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add it to .env or set it in your deployment environment.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
