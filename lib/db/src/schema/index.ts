import {
  boolean,
  index,
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
    profileImageUrl: text("profile_image_url"),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    temporaryPasswordIssuedAt: timestamp("temporary_password_issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const credentialEmailHistory = pgTable("credential_email_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: text("email").notNull(),
  recipientName: text("recipient_name").notNull(),
  temporaryPasswordMasked: text("temporary_password_masked").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("logged"),
  triggeredByUserId: integer("triggered_by_user_id").references(() => users.id),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    year: text("year").notNull(),
    branch: text("branch").notNull(),
    semester: integer("semester").notNull().default(1),
    credits: integer("credits").notNull().default(3),
    academicYear: text("academic_year").notNull().default("2024-25"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectUniqueIdx: uniqueIndex("subjects_code_year_branch_unique").on(table.code, table.year, table.branch, table.academicYear),
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

export const feedPosts = pgTable(
  "feed_posts",
  {
    id: serial("id").primaryKey(),
    authorUserId: integer("author_user_id").references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    status: text("status").notNull().default("draft"),
    visibility: text("visibility").notNull().default("all"),
    metadata: jsonb("metadata").notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCreatedIdx: index("feed_posts_status_created_idx").on(table.status, table.createdAt),
    authorIdx: index("feed_posts_author_idx").on(table.authorUserId),
  }),
);

export const feedMedia = pgTable(
  "feed_media",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").references(() => feedPosts.id).notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    caption: text("caption"),
    mimeType: text("mime_type"),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index("feed_media_post_idx").on(table.postId),
  }),
);

export const feedComments = pgTable(
  "feed_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").references(() => feedPosts.id).notNull(),
    authorUserId: integer("author_user_id").references(() => users.id).notNull(),
    parentCommentId: integer("parent_comment_id"),
    body: text("body").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postCreatedIdx: index("feed_comments_post_created_idx").on(table.postId, table.createdAt),
    parentIdx: index("feed_comments_parent_idx").on(table.parentCommentId),
    authorIdx: index("feed_comments_author_idx").on(table.authorUserId),
  }),
);

export const feedPostLikes = pgTable(
  "feed_post_likes",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").references(() => feedPosts.id).notNull(),
    userId: integer("user_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postUserUniqueIdx: uniqueIndex("feed_post_likes_post_user_unique").on(table.postId, table.userId),
    postIdx: index("feed_post_likes_post_idx").on(table.postId),
    userIdx: index("feed_post_likes_user_idx").on(table.userId),
  }),
);

export const feedReports = pgTable(
  "feed_reports",
  {
    id: serial("id").primaryKey(),
    reporterUserId: integer("reporter_user_id").references(() => users.id).notNull(),
    postId: integer("post_id").references(() => feedPosts.id),
    commentId: integer("comment_id").references(() => feedComments.id),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index("feed_reports_post_idx").on(table.postId),
    commentIdx: index("feed_reports_comment_idx").on(table.commentId),
    reporterIdx: index("feed_reports_reporter_idx").on(table.reporterUserId),
    statusIdx: index("feed_reports_status_idx").on(table.status),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type CredentialEmailHistory = typeof credentialEmailHistory.$inferSelect;
export type NewCredentialEmailHistory = typeof credentialEmailHistory.$inferInsert;
export type FeedPost = typeof feedPosts.$inferSelect;
export type NewFeedPost = typeof feedPosts.$inferInsert;
export type FeedMedia = typeof feedMedia.$inferSelect;
export type NewFeedMedia = typeof feedMedia.$inferInsert;
export type FeedComment = typeof feedComments.$inferSelect;
export type NewFeedComment = typeof feedComments.$inferInsert;
export type FeedPostLike = typeof feedPostLikes.$inferSelect;
export type NewFeedPostLike = typeof feedPostLikes.$inferInsert;
export type FeedReport = typeof feedReports.$inferSelect;
export type NewFeedReport = typeof feedReports.$inferInsert;
