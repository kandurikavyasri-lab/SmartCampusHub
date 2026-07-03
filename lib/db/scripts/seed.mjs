import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, scryptSync } from "node:crypto";
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

function hashPassword(password) {
  const salt = randomUUID();
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}

const users = [
  { email: "admin@university.edu", password: "admin123", role: "admin", name: "Dr. Ramesh Kumar", phone: "+91 98765 43210" },
  { email: "student@university.edu", password: "student123", role: "student", name: "Aarav Kumar", phone: "+91 98765 11001", hallTicketNumber: "22BCS0001", rollNumber: "22BCS0001", year: "3rd", branch: "CSE", section: "A", academicYear: "2024-25" },
  { email: "priya@university.edu", password: "student123", role: "student", name: "Priya Sharma", phone: "+91 98765 11002", hallTicketNumber: "22BCS0002", rollNumber: "22BCS0002", year: "3rd", branch: "CSE", section: "B", academicYear: "2024-25" },
  { email: "rahul@university.edu", password: "student123", role: "student", name: "Rahul Verma", phone: "+91 98765 11003", hallTicketNumber: "23BEC0001", rollNumber: "23BEC0001", year: "2nd", branch: "ECE", section: "A", academicYear: "2024-25" },
];

const timetable = [
  ["3rd", "CSE", "A", "2024-25", "Monday", "09:00", "10:00", "Data Structures & Algorithms", "Dr. Suresh Reddy", "CR-201"],
  ["3rd", "CSE", "A", "2024-25", "Monday", "10:00", "11:00", "Operating Systems", "Prof. Kavitha Menon", "CR-105"],
  ["3rd", "CSE", "A", "2024-25", "Tuesday", "09:00", "10:00", "Database Management Systems", "Dr. Anita Nair", "CR-203"],
  ["3rd", "CSE", "A", "2024-25", "Tuesday", "10:00", "11:00", "Computer Networks", "Prof. Rajan Sharma", "CR-107"],
  ["3rd", "CSE", "A", "2024-25", "Tuesday", "14:00", "15:00", "Software Engineering", "Dr. Priya Iyer", "CR-302"],
  ["3rd", "CSE", "A", "2024-25", "Thursday", "09:00", "10:00", "Machine Learning", "Dr. Venkat Rao", "CR-305"],
  ["3rd", "CSE", "B", "2024-25", "Monday", "10:00", "11:00", "Data Structures & Algorithms", "Dr. Suresh Reddy", "CR-202"],
  ["2nd", "ECE", "A", "2024-25", "Monday", "09:00", "10:00", "Signals & Systems", "Dr. Srinivas Murthy", "CR-301"],
  ["2nd", "ECE", "A", "2024-25", "Monday", "11:00", "12:00", "Digital Electronics", "Prof. Meena Pillai", "Lab-401"],
];

const subjects = [
  ["CS501", "Data Structures & Algorithms", "3rd", "CSE", 5, 4, "2024-25"],
  ["CS502", "Operating Systems", "3rd", "CSE", 5, 4, "2024-25"],
  ["CS503", "Database Management Systems", "3rd", "CSE", 5, 3, "2024-25"],
  ["CS504", "Computer Networks", "3rd", "CSE", 5, 3, "2024-25"],
  ["CS505", "Software Engineering", "3rd", "CSE", 5, 3, "2024-25"],
  ["CS506", "Machine Learning", "3rd", "CSE", 5, 4, "2024-25"],
  ["EC301", "Signals & Systems", "2nd", "ECE", 3, 4, "2024-25"],
  ["EC302", "Digital Electronics", "2nd", "ECE", 3, 4, "2024-25"],
  ["EE701", "Power Systems", "4th", "EEE", 7, 4, "2024-25"],
  ["EE702", "Control Systems", "4th", "EEE", 7, 4, "2024-25"],
];

const midMarks = [
  ["22BCS0001", "Data Structures & Algorithms", 22, 23, 5, "2024-25"],
  ["22BCS0001", "Operating Systems", 19, 21, 5, "2024-25"],
  ["22BCS0001", "Database Management Systems", 24, 25, 5, "2024-25"],
  ["22BCS0002", "Data Structures & Algorithms", 23, 24, 5, "2024-25"],
  ["23BEC0001", "Signals & Systems", 20, 21, 3, "2024-25"],
];

const semesterResults = [
  { hallTicketNumber: "22BCS0001", semester: 1, academicYear: "2024-25", sgpa: 8.5, cgpa: 8.5, status: "A", subjects: [{ code: "MA101", name: "Engineering Mathematics I", internalMarks: 22, externalMarks: 65, totalMarks: 87, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 4 }] },
];

const notifications = [
  ["Mid-1 Examination Schedule", "Mid-1 examinations will be conducted as per the published timetable.", "exam", "All", "All", "All"],
  ["Semester Results Declared", "Semester results have been published. Log in to view SGPA, CGPA, and subject-wise marks.", "result", "All", "All", "All"],
];

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const userIds = new Map();
    for (const user of users) {
      const result = await client.query("insert into users (email, password_hash, role, name, phone) values ($1,$2,$3,$4,$5) on conflict (email) do update set role=excluded.role, name=excluded.name, phone=excluded.phone, updated_at=now() returning id", [user.email, hashPassword(user.password), user.role, user.name, user.phone]);
      userIds.set(user.email, result.rows[0].id);
      if (user.role === "student") {
        await client.query("insert into students (user_id, hall_ticket_number, roll_number, year, branch, section, academic_year) values ($1,$2,$3,$4,$5,$6,$7) on conflict (hall_ticket_number) do update set user_id=excluded.user_id, roll_number=excluded.roll_number, year=excluded.year, branch=excluded.branch, section=excluded.section, academic_year=excluded.academic_year, updated_at=now()", [result.rows[0].id, user.hallTicketNumber, user.rollNumber, user.year, user.branch, user.section, user.academicYear]);
      }
    }

    for (const row of subjects) {
      await client.query(
        "insert into subjects (code, name, year, branch, semester, credits, academic_year, is_active) values ($1,$2,$3,$4,$5,$6,$7,true) on conflict (code, year, branch, academic_year) do update set name=excluded.name, semester=excluded.semester, credits=excluded.credits, is_active=true, updated_at=now()",
        row,
      );
    }
    for (const row of timetable) {
      const exists = await client.query("select id from timetable_entries where year=$1 and branch=$2 and section=$3 and academic_year=$4 and day=$5 and start_time=$6 and end_time=$7 and subject=$8 limit 1", row.slice(0, 8));
      if (exists.rowCount === 0) await client.query("insert into timetable_entries (year, branch, section, academic_year, day, start_time, end_time, subject, faculty, room) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", row);
    }
    for (const row of midMarks) {
      const student = await client.query("select id from students where hall_ticket_number=$1 limit 1", [row[0]]);
      const exists = await client.query("select id from mid_marks where hall_ticket_number=$1 and subject=$2 and semester=$3 and academic_year=$4 limit 1", [row[0], row[1], row[4], row[5]]);
      if (exists.rowCount === 0) await client.query("insert into mid_marks (student_id, hall_ticket_number, subject, mid1, mid2, semester, academic_year) values ($1,$2,$3,$4,$5,$6,$7)", [student.rows[0]?.id ?? null, row[0], row[1], row[2], row[3], row[4], row[5]]);
    }
    for (const result of semesterResults) {
      const student = await client.query("select id from students where hall_ticket_number=$1 limit 1", [result.hallTicketNumber]);
      const exists = await client.query("select id from semester_results where hall_ticket_number=$1 and semester=$2 and academic_year=$3 limit 1", [result.hallTicketNumber, result.semester, result.academicYear]);
      if (exists.rowCount === 0) await client.query("insert into semester_results (student_id, hall_ticket_number, semester, academic_year, sgpa, cgpa, status, subjects) values ($1,$2,$3,$4,$5,$6,$7,$8)", [student.rows[0]?.id ?? null, result.hallTicketNumber, result.semester, result.academicYear, result.sgpa, result.cgpa, result.status, JSON.stringify(result.subjects)]);
    }
    const adminUserId = userIds.get("admin@university.edu") ?? null;
    for (const row of notifications) {
      const exists = await client.query("select id from notifications where title=$1 and message=$2 limit 1", [row[0], row[1]]);
      if (exists.rowCount === 0) await client.query("insert into notifications (title, message, category, target_year, target_branch, target_section, created_by_user_id) values ($1,$2,$3,$4,$5,$6,$7)", [...row, adminUserId]);
    }
    await client.query("commit");
    console.log("Seed data inserted/updated successfully.");
  } catch (error) {
    await client.query("rollback");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
