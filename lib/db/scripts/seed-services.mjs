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

loadEnvFile(path.join(workspaceRoot, ".env"));
loadEnvFile(path.join(workspaceRoot, ".env.local"));
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_MIGRATION_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Add it to .env first.");
  process.exit(1);
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || "0";

const services = [
  ["attendance", "Attendance", "Track subject-wise attendance and shortage alerts.", "academics", "student", "check-square"],
  ["hall-ticket", "Exam Hall Ticket", "View hall ticket, exam room, and exam instructions.", "exams", "student", "file-text"],
  ["digital-id", "Digital ID Card", "QR-enabled student or staff identity card.", "identity", "all", "credit-card"],
  ["leave-od", "Leave / OD Requests", "Apply for leave, on-duty permissions, and approvals.", "requests", "student", "send"],
  ["helpdesk", "Helpdesk", "Raise issues and track admin responses.", "support", "all", "life-buoy"],
  ["faculty-directory", "Faculty Directory", "Department contacts, designations, and office hours.", "campus", "all", "users"],
  ["academic-calendar", "Academic Calendar", "Holidays, exams, deadlines, and university events.", "calendar", "all", "calendar"],
  ["assignments", "Assignments", "Faculty assignments and student submissions.", "academics", "student", "clipboard"],
  ["study-materials", "Study Materials", "Subject-wise notes, PDFs, and learning resources.", "academics", "student", "book-open"],
  ["library", "Library", "Issued books, due dates, search, and fine alerts.", "campus", "student", "book"],
  ["transport", "Transport", "Bus routes, timings, pickup points, and contacts.", "campus", "student", "truck"],
  ["hostel", "Hostel", "Room details, warden contacts, and hostel complaints.", "campus", "student", "home"],
  ["placements", "Placements", "Job postings, eligibility, applications, and interview schedules.", "career", "student", "briefcase"],
  ["events", "Events", "Register for workshops, seminars, and campus programs.", "campus", "all", "star"],
  ["faculty-attendance", "Attendance Management", "Faculty can record attendance and review class shortages.", "faculty", "faculty", "check-square"],
  ["faculty-assignments", "Assignment Management", "Faculty can publish assignments and materials.", "faculty", "faculty", "clipboard"],
  ["admin-requests", "Request Center", "Admins can review helpdesk, leave, hostel, library, and event requests.", "operations", "admin", "inbox"],
  ["admin-directory", "Directory & Calendar", "Admins can maintain faculty directory and academic calendar entries.", "operations", "admin", "settings"],
];

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const sql = "insert into university_services (code, title, description, category, target_role, icon, is_active, metadata) values ($1,$2,$3,$4,$5,$6,true,'{}'::jsonb) on conflict (code) do update set title=excluded.title, description=excluded.description, category=excluded.category, target_role=excluded.target_role, icon=excluded.icon, is_active=true, updated_at=now()";
    for (const row of services) await client.query(sql, row);
    await client.query("commit");
    console.log("Seeded " + services.length + " university services.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
