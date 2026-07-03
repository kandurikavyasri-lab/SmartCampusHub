import { db } from "@workspace/db";
import { students, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const router: Router = Router();

function getErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown server error";

  const details: string[] = [err.message];
  const cause = (err as Error & { cause?: unknown }).cause;

  if (cause instanceof Error && cause.message) {
    details.push(cause.message);
  } else if (cause && typeof cause === "object") {
    const dbCause = cause as { message?: string; detail?: string; code?: string };
    if (dbCause.message) details.push(dbCause.message);
    if (dbCause.detail) details.push(dbCause.detail);
    if (dbCause.code) details.push("code: " + dbCause.code);
  }

  return Array.from(new Set(details)).join(" | ");
}

function hashPassword(password: string): string {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const supplied = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const stored = Buffer.from(hash, "hex");
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

function toMobileUser(user: typeof users.$inferSelect, student?: typeof students.$inferSelect) {
  const year = student?.year ?? "";
  const branch = student?.branch ?? "";
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    password: "",
    role: user.role === "admin" ? "admin" : "student",
    year,
    branch,
    section: student?.section ?? "",
    rollNumber: student?.rollNumber ?? student?.hallTicketNumber ?? "",
    hallTicketNumber: student?.hallTicketNumber ?? "",
    academicYear: student?.academicYear ?? "2024-25",
    enrollmentNo: student?.rollNumber ?? student?.hallTicketNumber ?? "",
    batch: year && branch ? year + "-" + branch : "",
    department: branch,
    phone: user.phone ?? "",
    profileImageUrl: user.profileImageUrl ?? "",
    joinYear: student?.academicYear?.slice(0, 4) ?? new Date().getFullYear().toString(),
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, year, branch, section, rollNumber, hallTicketNumber, academicYear } = req.body as Record<string, string | undefined>;
    if (!name || !email || !password || !year || !branch || !section || !rollNumber) {
      res.status(400).json({ success: false, error: "Missing required registration fields." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }
    const insertedUsers = await db.insert(users).values({
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: "student",
      name: name.trim(),
      phone: phone?.trim() || null,
    }).returning();
    const user = insertedUsers[0];
    const ticketNumber = hallTicketNumber?.trim() || rollNumber.trim();
    const insertedStudents = await db.insert(students).values({
      userId: user.id,
      hallTicketNumber: ticketNumber,
      rollNumber: rollNumber.trim(),
      year,
      branch,
      section,
      academicYear: academicYear || "2024-25",
    }).returning();
    res.status(201).json({ success: true, user: toMobileUser(user, insertedStudents[0]) });
  } catch (err) {
    const message = getErrorMessage(err);
    req.log.error({ err, message }, "Registration failed");
    res.status(500).json({ success: false, error: "Registration failed: " + message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as Record<string, string | undefined>;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password are required." });
      return;
    }
    const foundUsers = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
    const user = foundUsers[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }
    const foundStudents = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
    res.json({ success: true, user: toMobileUser(user, foundStudents[0]), requiresPasswordChange: user.mustChangePassword ?? false });
  } catch (err) {
    const message = getErrorMessage(err);
    req.log.error({ err, message }, "Login failed");
    res.status(500).json({ success: false, error: "Login failed: " + message });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body as Record<string, string | undefined>;
    if (!userId || !currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: "Current password and new password are required." });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: "New password must be at least 8 characters." });
      return;
    }
    const foundUsers = await db.select().from(users).where(eq(users.id, Number(userId))).limit(1);
    const user = foundUsers[0];
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ success: false, error: "Current password is incorrect." });
      return;
    }
    const [updated] = await db.update(users).set({
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id)).returning();
    const foundStudents = await db.select().from(students).where(eq(students.userId, updated.id)).limit(1);
    res.json({ success: true, user: toMobileUser(updated, foundStudents[0]) });
  } catch (err) {
    const message = getErrorMessage(err);
    req.log.error({ err, message }, "Password change failed");
    res.status(500).json({ success: false, error: "Password change failed: " + message });
  }
});

export default router;
