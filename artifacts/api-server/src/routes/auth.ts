import { db } from "@workspace/db";
import { passwordResetRequests, students, users } from "@workspace/db/schema";
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

function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const supplied = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const stored = Buffer.from(hash, "hex");
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

async function sendEmail(to: string, subject: string, body: string, html?: string) {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.EMAIL_REPLY_TO;

  if (provider === "gmail" || (!process.env.RESEND_API_KEY && gmailUser && gmailPassword)) {
    if (!gmailUser || !gmailPassword || !from) {
      return { status: "logged", errorMessage: "Gmail email provider is not configured. Add GMAIL_USER, GMAIL_APP_PASSWORD, and EMAIL_FROM." };
    }
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });
      await transporter.sendMail({
        from,
        to,
        replyTo: replyTo || undefined,
        subject,
        text: body,
        html,
      });
      return { status: "sent", errorMessage: null };
    } catch (error) {
      return { status: "failed", errorMessage: error instanceof Error ? error.message : "Gmail email sending failed" };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !from) {
    return { status: "logged", errorMessage: "Email provider is not configured. Code was logged for local testing." };
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
        html,
        reply_to: replyTo || undefined,
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

async function findUserByIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) {
    return (await db.select().from(users).where(eq(users.email, normalized)).limit(1))[0];
  }

  const phoneDigits = normalizePhone(identifier);
  if (!phoneDigits) return undefined;
  const allUsers = await db.select().from(users);
  return allUsers.find((user) => {
    const accountPhone = normalizePhone(user.phone ?? "");
    return accountPhone && (accountPhone.endsWith(phoneDigits) || phoneDigits.endsWith(accountPhone));
  });
}

function buildResetEmail(user: typeof users.$inferSelect, code: string) {
  const escapedName = user.name.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[char] ?? char));
  return {
    subject: "SmartCampusHub password reset code",
    body: [
      "Dear " + user.name + ",",
      "",
      "Use this code to reset your SmartCampusHub password:",
      "",
      code,
      "",
      "This code expires in 15 minutes. If you did not request this, please ignore this message.",
      "",
      "Regards,",
      "SmartCampusHub Administration",
    ].join("\n"),
    html: [
      '<div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:28px;color:#0f172a">',
      '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">',
      '<div style="background:#2563eb;color:#ffffff;padding:22px 26px">',
      '<h1 style="margin:0;font-size:22px;line-height:1.3">SmartCampusHub Password Reset</h1>',
      '<p style="margin:6px 0 0;opacity:.9">University account security</p>',
      "</div>",
      '<div style="padding:26px">',
      '<p style="margin:0 0 14px">Dear ' + escapedName + ",</p>",
      '<p style="margin:0 0 18px;line-height:1.6">Use the verification code below to reset your SmartCampusHub password.</p>',
      '<div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:14px;padding:18px;margin:20px 0">' + code + "</div>",
      '<p style="margin:0 0 8px;line-height:1.6">This code expires in <strong>15 minutes</strong>.</p>',
      '<p style="margin:0;color:#64748b;line-height:1.6">If you did not request this password reset, you can safely ignore this email.</p>',
      "</div>",
      '<div style="padding:16px 26px;background:#f8fafc;color:#64748b;font-size:13px">SmartCampusHub Administration</div>',
      "</div>",
      "</div>",
    ].join(""),
  };
}

function getDefaultAcademicYear(date = new Date()): string {
  const calendarYear = date.getFullYear();
  const startYear = date.getMonth() >= 5 ? calendarYear : calendarYear - 1;
  return startYear + "-" + String(startYear + 1).slice(-2);
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
    academicYear: student?.academicYear ?? getDefaultAcademicYear(),
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
      academicYear: academicYear || getDefaultAcademicYear(),
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

router.post("/forgot-password/request", async (req, res) => {
  try {
    const identifier = String(req.body.identifier ?? "").trim();
    if (!identifier) {
      res.status(400).json({ success: false, error: "Enter your email or mobile number." });
      return;
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !user.isActive) {
      res.json({ success: true, message: "If this account exists, a reset code has been sent." });
      return;
    }

    const code = generateResetCode();
    const email = buildResetEmail(user, code);
    const delivery = await sendEmail(user.email, email.subject, email.body, email.html);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(passwordResetRequests).values({
      userId: user.id,
      identifier,
      channel: identifier.includes("@") ? "email" : "phone",
      codeHash: hashPassword(code),
      deliveryStatus: delivery.status,
      errorMessage: delivery.errorMessage,
      expiresAt,
    });

    const isProduction = process.env.NODE_ENV === "production";
    if (delivery.status === "failed") {
      res.status(502).json({ success: false, error: "Could not send reset email. " + (delivery.errorMessage || "Please check email provider settings.") });
      return;
    }
    if (delivery.status === "logged" && isProduction) {
      res.status(500).json({ success: false, error: "Email provider is not configured. Add RESEND_API_KEY and EMAIL_FROM in the backend environment." });
      return;
    }

    res.json({
      success: true,
      message: delivery.status === "sent"
        ? "Reset code sent to your registered email."
        : "Reset code generated. Email/SMS delivery is not configured for this environment.",
      deliveryStatus: delivery.status,
      devCode: delivery.status === "sent" || isProduction ? undefined : code,
    });
  } catch (err) {
    const message = getErrorMessage(err);
    req.log.error({ err, message }, "Password reset request failed");
    res.status(500).json({ success: false, error: "Password reset request failed: " + message });
  }
});

router.post("/forgot-password/confirm", async (req, res) => {
  try {
    const identifier = String(req.body.identifier ?? "").trim();
    const code = String(req.body.code ?? "").trim();
    const newPassword = String(req.body.newPassword ?? "");
    if (!identifier || !code || !newPassword) {
      res.status(400).json({ success: false, error: "Identifier, reset code, and new password are required." });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: "New password must be at least 8 characters." });
      return;
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      res.status(400).json({ success: false, error: "Invalid or expired reset code." });
      return;
    }

    const requests = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id));
    const request = requests
      .filter((item) => item.status === "pending" && !item.usedAt && item.expiresAt.getTime() > Date.now())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!request || !verifyPassword(code, request.codeHash)) {
      res.status(400).json({ success: false, error: "Invalid or expired reset code." });
      return;
    }

    const [updated] = await db.update(users).set({
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id)).returning();
    await db.update(passwordResetRequests).set({
      status: "used",
      usedAt: new Date(),
    }).where(eq(passwordResetRequests.id, request.id));

    const foundStudents = await db.select().from(students).where(eq(students.userId, updated.id)).limit(1);
    res.json({ success: true, user: toMobileUser(updated, foundStudents[0]) });
  } catch (err) {
    const message = getErrorMessage(err);
    req.log.error({ err, message }, "Password reset confirmation failed");
    res.status(500).json({ success: false, error: "Password reset failed: " + message });
  }
});

export default router;
