import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "../../..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function codeFromSubject(subject, index) {
  const words = subject
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const prefix = words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] || "SUB").slice(0, 3);
  return (prefix || "SUB").slice(0, 4).toUpperCase() + String(index + 1).padStart(2, "0");
}

loadEnvFile(path.join(workspaceRoot, ".env"));
loadEnvFile(path.join(workspaceRoot, ".env.local"));

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_MIGRATION_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Add it to .env first.");
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || "0";
const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    const rows = await client.query("select distinct year, branch, academic_year, subject from timetable_entries where subject is not null and trim(subject) <> '' order by year, branch, subject");
    let inserted = 0;
    let updated = 0;
    for (const [index, row] of rows.rows.entries()) {
      const code = codeFromSubject(row.subject, index);
      const result = await client.query(
        "insert into subjects (code, name, year, branch, semester, credits, academic_year, is_active) values ($1,$2,$3,$4,1,3,$5,true) on conflict (code, year, branch, academic_year) do update set name=excluded.name, is_active=true, updated_at=now() returning (xmax = 0) as inserted",
        [code, row.subject, row.year, row.branch, row.academic_year || "2024-25"],
      );
      if (result.rows[0]?.inserted) inserted += 1;
      else updated += 1;
    }
    console.log("Subjects synced from timetable. Inserted: " + inserted + ", Updated: " + updated + ", Total: " + rows.rowCount);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
