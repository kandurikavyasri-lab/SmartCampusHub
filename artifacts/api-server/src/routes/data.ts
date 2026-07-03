import { db } from "@workspace/db";
import {
  midMarks,
  notifications,
  semesterResults,
  students,
  subjects,
  timetableEntries,
  uploadedFiles,
  users,
  credentialEmailHistory,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { randomUUID, scryptSync } from "node:crypto";

const router: Router = Router();
const profileUploadDirectory = join(process.cwd(), "uploads", "profiles");
mkdirSync(profileUploadDirectory, { recursive: true });

function mapNotification(n: any) {
  return {
    id: String(n.id),
    title: n.title,
    body: n.message,
    timestamp: n.publishedAt.toISOString(),
    category: n.category,
    targetYear: n.targetYear ?? "All",
    targetBranch: n.targetBranch ?? "All",
    targetBatch: (n.targetYear ?? "All") + "-" + (n.targetBranch ?? "All"),
    sentBy: n.createdByUserId ? String(n.createdByUserId) : "admin-001",
    isRead: false,
  };
}

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: profileUploadDirectory,
    filename: (_req, file, callback) => callback(null, randomUUID() + extname(file.originalname || "")),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/")) callback(null, true);
    else callback(new Error("Only image uploads are allowed."));
  },
});


function generateTemporaryPassword(): string {
  return "SCH-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function maskPassword(password: string): string {
  if (password.length <= 4) return "****";
  return password.slice(0, 4) + "****" + password.slice(-2);
}

function buildCredentialEmail(user: { name: string; email: string; role: string }, temporaryPassword: string) {
  const subject = "SmartCampusHub temporary login credentials";
  const body = [
    "Dear " + user.name + ",",
    "",
    "Your SmartCampusHub account has been created for the university portal.",
    "",
    "Login email: " + user.email,
    "Temporary password: " + temporaryPassword,
    "Account type: " + (user.role === "admin" ? "Administrator" : "Student"),
    "",
    "For security, you will be asked to create a new password immediately after your first login.",
    "If you did not request this account, please contact the college administration office.",
    "",
    "Regards,",
    "SmartCampusHub Administration",
  ].join("\n");
  return { subject, body };
}

async function sendCredentialEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { status: "logged", errorMessage: "Email provider is not configured. Add RESEND_API_KEY and EMAIL_FROM." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return { status: "failed", errorMessage: details || "Email provider returned HTTP " + response.status };
    }
    return { status: "sent", errorMessage: null };
  } catch (error) {
    return { status: "failed", errorMessage: error instanceof Error ? error.message : "Email sending failed" };
  }
}

async function logCredentialEmail(user: typeof users.$inferSelect, temporaryPassword: string, triggeredByUserId?: number | null) {
  const email = buildCredentialEmail(user, temporaryPassword);
  const delivery = await sendCredentialEmail(user.email, email.subject, email.body);
  const [history] = await db.insert(credentialEmailHistory).values({
    userId: user.id,
    email: user.email,
    recipientName: user.name,
    temporaryPasswordMasked: maskPassword(temporaryPassword),
    subject: email.subject,
    body: email.body,
    status: delivery.status,
    triggeredByUserId: triggeredByUserId || null,
    errorMessage: delivery.errorMessage,
    sentAt: delivery.status === "sent" ? new Date() : null,
  }).returning();
  return { ...history, body: email.body, deliveryStatus: delivery.status, errorMessage: delivery.errorMessage };
}

function hashPassword(password: string): string {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toMobileStudent(user: typeof users.$inferSelect, student?: typeof students.$inferSelect) {
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
    batch: year && branch ? year + "-" + branch : user.role === "admin" ? "Admin" : "",
    department: branch || (user.role === "admin" ? "Administration" : ""),
    phone: user.phone ?? "",
    profileImageUrl: user.profileImageUrl ?? "",
    joinYear: student?.academicYear?.slice(0, 4) ?? new Date().getFullYear().toString(),
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

async function listUsers() {
  const allUsers = await db.select().from(users);
  const allStudents = await db.select().from(students);
  return allUsers.map((user: any) => toMobileStudent(user, allStudents.find((s: any) => s.userId === user.id)));
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const message = String(err.message ?? err.cause?.message ?? "").toLowerCase();
  return err.code === "42P01" || err.cause?.code === "42P01" || message.includes('relation "' + tableName + '" does not exist');
}

async function optionalTable<T>(query: Promise<T>, tableName: string, fallback: T): Promise<T> {
  try {
    return await query;
  } catch (error) {
    if (isMissingTableError(error, tableName)) return fallback;
    throw error;
  }
}

async function getBootstrapData() {
  const [tt, nn, mm, sr, uf, sub] = await Promise.all([
    db.select().from(timetableEntries),
    db.select().from(notifications),
    db.select().from(midMarks),
    db.select().from(semesterResults),
    db.select().from(uploadedFiles),
    optionalTable(db.select().from(subjects), "subjects", []),
  ]);

  return {
    timetable: tt.map((t: any) => ({
      id: String(t.id),
      day: t.day,
      time: t.startTime,
      endTime: t.endTime,
      subject: t.subject,
      subjectCode: "",
      room: t.room ?? "",
      teacher: t.faculty ?? "",
      year: t.year,
      branch: t.branch,
      section: t.section,
      batch: t.year + "-" + t.branch,
    })),
    notifications: nn.map(mapNotification),
    midMarks: mm.map((m: any) => ({
      id: String(m.id),
      studentId: m.hallTicketNumber,
      subjectCode: m.subject.slice(0, 8).toUpperCase(),
      subjectName: m.subject,
      midTerm1: toNumber(m.mid1),
      midTerm2: toNumber(m.mid2),
      maxMarks: 25,
    })),
    semesterResults: sr.map((r: any) => ({
      id: String(r.id),
      studentId: r.hallTicketNumber,
      semester: r.semester,
      sgpa: toNumber(r.sgpa),
      cgpa: toNumber(r.cgpa),
      grade: r.status,
      subjects: Array.isArray(r.subjects) ? r.subjects : [],
      gpa: toNumber(r.sgpa),
    })),
    subjects: sub.map((s: any) => ({
      id: String(s.id),
      code: s.code,
      name: s.name,
      year: s.year,
      branch: s.branch,
      semester: s.semester,
      credits: s.credits,
      academicYear: s.academicYear,
      isActive: s.isActive,
    })),
    uploadHistory: uf.map((f: any) => ({
      id: String(f.id),
      filename: f.filename,
      uploadedAt: f.createdAt.toISOString(),
      year: typeof f.parsedSummary === "object" && f.parsedSummary && "year" in f.parsedSummary ? String(f.parsedSummary.year) : "",
      branch: typeof f.parsedSummary === "object" && f.parsedSummary && "branch" in f.parsedSummary ? String(f.parsedSummary.branch) : "",
      semester: typeof f.parsedSummary === "object" && f.parsedSummary && "semester" in f.parsedSummary ? Number(f.parsedSummary.semester) : 0,
      dataType: f.dataType,
      format: f.fileType,
      recordCount: typeof f.parsedSummary === "object" && f.parsedSummary && "recordCount" in f.parsedSummary ? Number(f.parsedSummary.recordCount) : 0,
      successCount: typeof f.parsedSummary === "object" && f.parsedSummary && "successCount" in f.parsedSummary ? Number(f.parsedSummary.successCount) : 0,
    })),
  };
}

router.get("/bootstrap", async (_req, res) => {
  res.json(await getBootstrapData());
});

router.get("/users", async (_req, res) => {
  res.json({ success: true, users: await listUsers() });
});

router.post("/users", async (req, res) => {
  const role = req.body.role === "admin" ? "admin" : "student";
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const name = String(req.body.name ?? "").trim();
  if (!email || !name) {
    res.status(400).json({ success: false, error: "Name and email are required." });
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ success: false, error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(users).values({
    email,
    name,
    role,
    phone: req.body.phone || null,
    passwordHash: hashPassword(String(req.body.password || (role === "admin" ? "admin123" : "student123"))),
    mustChangePassword: req.body.sendCredentials !== false,
    temporaryPasswordIssuedAt: req.body.sendCredentials !== false ? new Date() : null,
  }).returning();

  let student: typeof students.$inferSelect | undefined;
  if (role === "student") {
    [student] = await db.insert(students).values({
      userId: user.id,
      hallTicketNumber: String(req.body.hallTicketNumber || req.body.rollNumber || email),
      rollNumber: String(req.body.rollNumber || req.body.hallTicketNumber || ""),
      year: String(req.body.year || ""),
      branch: String(req.body.branch || ""),
      section: String(req.body.section || ""),
      academicYear: String(req.body.academicYear || "2024-25"),
    }).returning();
  }

  let credentialEmail = null;
  if (req.body.sendCredentials !== false) {
    credentialEmail = await logCredentialEmail(user, String(req.body.password || (role === "admin" ? "admin123" : "student123")), Number(req.body.triggeredByUserId) || null);
  }

  res.status(201).json({ success: true, user: toMobileStudent(user, student), credentialEmail });
});

router.put("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existingUser) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const [user] = await db.update(users).set({
    name: req.body.name || existingUser.name,
    email: req.body.email || existingUser.email,
    phone: req.body.phone || null,
    profileImageUrl: req.body.profileImageUrl || existingUser.profileImageUrl || null,
    role: req.body.role === "admin" ? "admin" : "student",
    updatedAt: new Date(),
  }).where(eq(users.id, id)).returning();

  const foundStudents = await db.select().from(students).where(eq(students.userId, id)).limit(1);
  let student = foundStudents[0];
  if (user.role === "student") {
    const values = {
      userId: id,
      hallTicketNumber: String(req.body.hallTicketNumber || req.body.rollNumber || ""),
      rollNumber: String(req.body.rollNumber || req.body.hallTicketNumber || ""),
      year: String(req.body.year || ""),
      branch: String(req.body.branch || ""),
      section: String(req.body.section || ""),
      academicYear: String(req.body.academicYear || "2024-25"),
      updatedAt: new Date(),
    };
    if (student) [student] = await db.update(students).set(values).where(eq(students.id, student.id)).returning();
    else [student] = await db.insert(students).values(values).returning();
  }

  res.json({ success: true, user: toMobileStudent(user, student) });
});


router.post("/users/:id/profile-image", (req, res, next) => {
  if (req.is("application/json")) { next(); return; }
  profileUpload.single("file")(req, res, (error) => {
    if (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Profile image upload failed." });
      return;
    }
    next();
  });
}, async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const rawImage = String(req.body?.profileImageData || req.body?.imageData || req.body?.dataUrl || "");
  const mimeType = String(req.body?.mimeType || "image/jpeg");
  let profileImageUrl = "";
  if (rawImage) {
    profileImageUrl = rawImage.startsWith("data:image/") ? rawImage : "data:" + mimeType + ";base64," + rawImage;
  } else if (req.file) {
    profileImageUrl = req.protocol + "://" + req.get("host") + "/uploads/profiles/" + req.file.filename;
  }

  if (!profileImageUrl || !profileImageUrl.startsWith("data:image/") && !/^https?:\/\//i.test(profileImageUrl)) {
    res.status(400).json({ success: false, error: "Please choose an image to upload." });
    return;
  }
  if (profileImageUrl.startsWith("data:image/") && profileImageUrl.length > 10 * 1024 * 1024) {
    res.status(400).json({ success: false, error: "Profile image is too large. Please choose a smaller image." });
    return;
  }

  const [updated] = await db.update(users).set({ profileImageUrl, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  const student = (await db.select().from(students).where(eq(students.userId, id)).limit(1))[0];
  res.status(201).json({ success: true, user: toMobileStudent(updated, student), profileImageUrl });
});

router.get("/users/:id/credential-history", async (req, res) => {
  const userId = Number(req.params.id);
  const rows = await db.select().from(credentialEmailHistory).where(eq(credentialEmailHistory.userId, userId));
  res.json({
    success: true,
    history: rows.map((row: any) => ({
      id: String(row.id),
      userId: String(row.userId),
      email: row.email,
      recipientName: row.recipientName,
      temporaryPasswordMasked: row.temporaryPasswordMasked,
      subject: row.subject,
      body: row.body,
      status: row.status,
      errorMessage: row.errorMessage,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

router.post("/users/:id/credentials", async (req, res) => {
  const userId = Number(req.params.id);
  const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const existing = found[0];
  if (!existing) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }
  const temporaryPassword = String(req.body.password || generateTemporaryPassword());
  const [updated] = await db.update(users).set({
    passwordHash: hashPassword(temporaryPassword),
    mustChangePassword: true,
    temporaryPasswordIssuedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(users.id, userId)).returning();
  const credentialEmail = await logCredentialEmail(updated, temporaryPassword, Number(req.body.triggeredByUserId) || null);
  const student = (await db.select().from(students).where(eq(students.userId, userId)).limit(1))[0];
  res.json({ success: true, user: toMobileStudent(updated, student), credentialEmail, temporaryPassword });
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(students).where(eq(students.userId, id));
  await db.delete(users).where(eq(users.id, id));
  res.json({ success: true });
});

router.get("/subjects", async (req, res) => {
  const allSubjects = await db.select().from(subjects);
  const year = typeof req.query.year === "string" ? req.query.year : "";
  const branch = typeof req.query.branch === "string" ? req.query.branch : "";
  const filtered = allSubjects.filter((subject: any) => {
    const yearMatch = !year || subject.year === year || subject.year === "All";
    const branchMatch = !branch || subject.branch === branch || subject.branch === "All";
    return subject.isActive && yearMatch && branchMatch;
  });
  res.json({
    success: true,
    subjects: filtered.map((s: any) => ({
      id: String(s.id),
      code: s.code,
      name: s.name,
      year: s.year,
      branch: s.branch,
      semester: s.semester,
      credits: s.credits,
      academicYear: s.academicYear,
      isActive: s.isActive,
    })),
  });
});

router.post("/subjects", async (req, res) => {
  const code = String(req.body.code ?? "").trim().toUpperCase();
  const name = String(req.body.name ?? "").trim();
  const year = String(req.body.year ?? "").trim();
  const branch = String(req.body.branch ?? "").trim();
  if (!code || !name || !year || !branch) {
    res.status(400).json({ success: false, error: "Code, name, year, and department are required." });
    return;
  }
  const [subject] = await db.insert(subjects).values({
    code,
    name,
    year,
    branch,
    semester: Number(req.body.semester || 1),
    credits: Number(req.body.credits || 3),
    academicYear: String(req.body.academicYear || "2024-25"),
  }).returning();
  res.status(201).json({ success: true, subject: { ...subject, id: String(subject.id) } });
});

router.put("/subjects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [subject] = await db.update(subjects).set({
    code: String(req.body.code ?? "").trim().toUpperCase(),
    name: String(req.body.name ?? "").trim(),
    year: String(req.body.year ?? "").trim(),
    branch: String(req.body.branch ?? "").trim(),
    semester: Number(req.body.semester || 1),
    credits: Number(req.body.credits || 3),
    academicYear: String(req.body.academicYear || "2024-25"),
    isActive: req.body.isActive !== false,
    updatedAt: new Date(),
  }).where(eq(subjects.id, id)).returning();
  if (!subject) {
    res.status(404).json({ success: false, error: "Subject not found" });
    return;
  }
  res.json({ success: true, subject: { ...subject, id: String(subject.id) } });
});

router.delete("/subjects/:id", async (req, res) => {
  await db.update(subjects).set({ isActive: false, updatedAt: new Date() }).where(eq(subjects.id, Number(req.params.id)));
  res.json({ success: true });
});

router.post("/timetable", async (req, res) => {
  const [entry] = await db.insert(timetableEntries).values({
    year: req.body.year,
    branch: req.body.branch,
    section: req.body.section,
    academicYear: req.body.academicYear || "2024-25",
    day: req.body.day,
    startTime: req.body.time,
    endTime: req.body.endTime,
    subject: req.body.subject,
    faculty: req.body.teacher || null,
    room: req.body.room || null,
  }).returning();
  res.status(201).json({ success: true, id: String(entry.id) });
});

router.put("/timetable/:id", async (req, res) => {
  await db.update(timetableEntries).set({
    year: req.body.year,
    branch: req.body.branch,
    section: req.body.section,
    day: req.body.day,
    startTime: req.body.time,
    endTime: req.body.endTime,
    subject: req.body.subject,
    faculty: req.body.teacher || null,
    room: req.body.room || null,
  }).where(eq(timetableEntries.id, Number(req.params.id)));
  res.json({ success: true });
});

router.delete("/timetable/:id", async (req, res) => {
  await db.delete(timetableEntries).where(eq(timetableEntries.id, Number(req.params.id)));
  res.json({ success: true });
});

router.post("/notifications", async (req, res) => {
  const title = String(req.body.title ?? "").trim();
  const message = String(req.body.body ?? req.body.message ?? "").trim();
  if (!title || !message) {
    res.status(400).json({ success: false, error: "Notification title and message are required." });
    return;
  }
  const [n] = await db.insert(notifications).values({
    title,
    message,
    category: req.body.category || "general",
    targetYear: req.body.targetYear || "All",
    targetBranch: req.body.targetBranch || "All",
    targetSection: req.body.targetSection || "All",
    createdByUserId: Number(req.body.sentBy) || null,
  }).returning();
  res.status(201).json({ success: true, id: String(n.id), timestamp: n.publishedAt.toISOString(), notification: mapNotification(n) });
});

router.put("/notifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  const title = String(req.body.title ?? "").trim();
  const message = String(req.body.body ?? req.body.message ?? "").trim();
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ success: false, error: "Invalid notification id." });
    return;
  }
  if (!title || !message) {
    res.status(400).json({ success: false, error: "Notification title and message are required." });
    return;
  }
  const [n] = await db.update(notifications).set({
    title,
    message,
    category: req.body.category || "general",
    targetYear: req.body.targetYear || "All",
    targetBranch: req.body.targetBranch || "All",
    targetSection: req.body.targetSection || "All",
    createdByUserId: Number(req.body.sentBy) || null,
  }).where(eq(notifications.id, id)).returning();
  if (!n) {
    res.status(404).json({ success: false, error: "Notification not found." });
    return;
  }
  res.json({ success: true, notification: mapNotification(n) });
});

router.delete("/notifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ success: false, error: "Invalid notification id." });
    return;
  }
  await db.delete(notifications).where(eq(notifications.id, id));
  res.json({ success: true });
});

router.post("/mid-marks", async (req, res) => {
  const [mark] = await db.insert(midMarks).values({
    hallTicketNumber: req.body.studentId,
    subject: req.body.subjectName || req.body.subjectCode,
    mid1: String(req.body.midTerm1 ?? 0),
    mid2: String(req.body.midTerm2 ?? 0),
    semester: Number(req.body.semester || 0),
    academicYear: req.body.academicYear || "2024-25",
  }).returning();
  res.status(201).json({ success: true, id: String(mark.id) });
});

router.post("/semester-results", async (req, res) => {
  const [result] = await db.insert(semesterResults).values({
    hallTicketNumber: req.body.studentId,
    semester: Number(req.body.semester || 0),
    academicYear: req.body.academicYear || "2024-25",
    sgpa: String(req.body.sgpa ?? req.body.gpa ?? 0),
    cgpa: String(req.body.cgpa ?? req.body.sgpa ?? req.body.gpa ?? 0),
    status: req.body.grade || "pass",
    subjects: req.body.subjects || [],
  }).returning();
  res.status(201).json({ success: true, id: String(result.id) });
});

router.get("/upload-history", async (_req, res) => {
  const data = await getBootstrapData();
  res.json({ success: true, history: data.uploadHistory });
});

router.post("/upload-history", async (req, res) => {
  const [file] = await db.insert(uploadedFiles).values({
    filename: req.body.filename,
    fileType: req.body.format || "unknown",
    dataType: req.body.dataType || "unknown",
    parsedSummary: {
      year: req.body.year,
      branch: req.body.branch,
      semester: req.body.semester,
      recordCount: req.body.recordCount,
      successCount: req.body.successCount,
    },
  }).returning();
  res.status(201).json({ success: true, id: String(file.id) });
});

export default router;
