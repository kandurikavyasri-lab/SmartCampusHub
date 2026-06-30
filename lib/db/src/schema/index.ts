import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("student"),
    name: text("name").notNull(),
    phone: text("phone"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    hallTicketNumber: text("hall_ticket_number").notNull(),
    rollNumber: text("roll_number"),
    year: text("year").notNull(),
    branch: text("branch").notNull(),
    section: text("section").notNull(),
    academicYear: text("academic_year").notNull(),
    semester: integer("semester"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    hallTicketIdx: uniqueIndex("students_hall_ticket_unique").on(table.hallTicketNumber),
  }),
);

export const timetableEntries = pgTable("timetable_entries", {
  id: serial("id").primaryKey(),
  year: text("year").notNull(),
  branch: text("branch").notNull(),
  section: text("section").notNull(),
  academicYear: text("academic_year").notNull(),
  day: text("day").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  subject: text("subject").notNull(),
  faculty: text("faculty"),
  room: text("room"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull().default("general"),
  targetYear: text("target_year").default("All"),
  targetBranch: text("target_branch").default("All"),
  targetSection: text("target_section").default("All"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isPinned: boolean("is_pinned").notNull().default(false),
});

export const midMarks = pgTable("mid_marks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  hallTicketNumber: text("hall_ticket_number").notNull(),
  subject: text("subject").notNull(),
  mid1: numeric("mid1", { precision: 5, scale: 2 }),
  mid2: numeric("mid2", { precision: 5, scale: 2 }),
  semester: integer("semester").notNull(),
  academicYear: text("academic_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const semesterResults = pgTable("semester_results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  hallTicketNumber: text("hall_ticket_number").notNull(),
  semester: integer("semester").notNull(),
  academicYear: text("academic_year").notNull(),
  sgpa: numeric("sgpa", { precision: 4, scale: 2 }),
  cgpa: numeric("cgpa", { precision: 4, scale: 2 }),
  status: text("status").notNull().default("pass"),
  subjects: jsonb("subjects").notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  dataType: text("data_type").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id),
  storagePath: text("storage_path"),
  parsedSummary: jsonb("parsed_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
