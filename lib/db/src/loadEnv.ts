import fs from "fs";
import path from "path";

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key ? [key, value] : null;
}

function findWorkspaceEnv(startDir: string): string | null {
  let current = startDir;

  while (true) {
    const candidate = path.join(current, ".env");
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function loadWorkspaceEnv(startDir = process.cwd()): void {
  const envPath = findWorkspaceEnv(startDir);
  if (!envPath) return;

  const contents = fs.readFileSync(envPath, "utf-8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;

    const [key, value] = parsed;
    process.env[key] ??= value;
  }
}


function removeSslMode(databaseUrl: string): string {
  const [base, query = ""] = databaseUrl.split("?");
  if (!query) return databaseUrl;

  const params = new URLSearchParams(query);
  params.delete("sslmode");
  params.delete("uselibpqcompat");

  const remaining = params.toString();
  return remaining ? base + "?" + remaining : base;
}

export function getDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  return databaseUrl ? removeSslMode(databaseUrl) : undefined;
}

export function getMigrationDatabaseUrl(): string | undefined {
  const migrationUrl = process.env.DATABASE_MIGRATION_URL;
  if (migrationUrl) return removeSslMode(migrationUrl);
  return getDatabaseUrl();
}
