import { db } from "@workspace/db";
import { feedComments, feedMedia, feedPostLikes, feedPosts, feedReports, users } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

const router: Router = Router();
const POST_STATUSES = new Set(["draft", "published", "archived"]);
const MEDIA_TYPES = new Set(["image", "video"]);
const REPORT_REASONS = new Set(["spam", "abuse", "misleading", "inappropriate", "other"]);
const uploadDirectory = join(process.cwd(), "uploads", "feed");
mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, randomUUID() + extname(file.originalname || "")),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) callback(null, true);
    else callback(new Error("Only image and video uploads are allowed."));
  },
});

type Actor = typeof users.$inferSelect;
type FeedPost = typeof feedPosts.$inferSelect;
type FeedMedia = typeof feedMedia.$inferSelect;
type FeedComment = typeof feedComments.$inferSelect;
type SerializedComment = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  body: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; role: string; profileImageUrl?: string } | null;
  replies: SerializedComment[];
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clientError(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}

async function getActor(req: Request): Promise<Actor | null> {
  const raw = req.header("x-user-id") ?? req.query.actorUserId ?? req.body?.actorUserId ?? req.body?.userId;
  const id = toNumber(raw, 0);
  if (!id) return null;
  const [actor] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return actor ?? null;
}

async function requireActor(req: Request, res: Response) {
  const actor = await getActor(req);
  if (!actor || !actor.isActive) {
    clientError(res, 401, "Please login again before using the feed.");
    return null;
  }
  return actor;
}

async function requireAdmin(req: Request, res: Response) {
  const actor = await requireActor(req, res);
  if (!actor) return null;
  if (actor.role !== "admin") {
    clientError(res, 403, "Only admins can manage feed posts.");
    return null;
  }
  return actor;
}

function validateMedia(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => {
    const media = item as Record<string, unknown>;
    const type = cleanString(media.type).toLowerCase();
    const url = cleanString(media.url);
    const caption = cleanString(media.caption);
    const mimeType = cleanString(media.mimeType);
    if (!MEDIA_TYPES.has(type)) throw new Error("Media type must be image or video.");
    if (!url) throw new Error("Media URL is required.");
    if (!/^https?:\/\//i.test(url) && !/^data:(image|video)\//i.test(url)) {
      throw new Error("Media must be a valid http(s) URL or image/video data URL.");
    }
    return {
      type,
      url,
      caption: caption || null,
      mimeType: mimeType || null,
      sortOrder: toNumber(media.sortOrder, index),
      metadata: typeof media.metadata === "object" && media.metadata ? media.metadata : {},
    };
  });
}

function validatePostPayload(body: Record<string, unknown>, partial = false) {
  const title = cleanString(body.title);
  const content = cleanString(body.body ?? body.content);
  const status = cleanString(body.status || "draft").toLowerCase();
  const visibility = cleanString(body.visibility || "all") || "all";
  if (!partial || title) {
    if (title.length < 3) throw new Error("Post title must contain at least 3 characters.");
    if (title.length > 160) throw new Error("Post title must be 160 characters or less.");
  }
  if (!partial || content) {
    if (content.length > 8000) throw new Error("Post content is too long.");
  }
  if (status && !POST_STATUSES.has(status)) throw new Error("Invalid feed post status.");
  const media = body.media === undefined ? undefined : validateMedia(body.media);
  if (!partial && !content && (!media || media.length === 0)) {
    throw new Error("Add text or at least one media item before saving.");
  }
  return { title, body: content, status, visibility, media };
}

function validateCommentBody(value: unknown): string {
  const body = cleanString(value);
  if (body.length < 1) throw new Error("Comment cannot be empty.");
  if (body.length > 1200) throw new Error("Comment must be 1200 characters or less.");
  return body;
}

function validateReport(body: Record<string, unknown>) {
  const reason = cleanString(body.reason || "other").toLowerCase();
  const details = cleanString(body.details);
  if (!REPORT_REASONS.has(reason)) throw new Error("Invalid report reason.");
  if (details.length > 1500) throw new Error("Report details must be 1500 characters or less.");
  return { reason, details: details || null };
}

async function ensurePostVisible(postId: number, actor: Actor) {
  const [post] = await db.select().from(feedPosts).where(eq(feedPosts.id, postId)).limit(1);
  if (!post) return null;
  if (actor.role !== "admin" && post.status !== "published") return null;
  return post;
}

function serializeComment(comment: FeedComment, author?: Actor, replies: FeedComment[] = [], authors: Actor[] = []): SerializedComment {
  return {
    id: String(comment.id),
    postId: String(comment.postId),
    parentCommentId: comment.parentCommentId ? String(comment.parentCommentId) : null,
    body: comment.isDeleted ? "This comment was deleted." : comment.body,
    isDeleted: comment.isDeleted,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: author ? { id: String(author.id), name: author.name, role: author.role, profileImageUrl: author.profileImageUrl ?? "" } : null,
    replies: replies.map((reply) => serializeComment(reply, authors.find((u) => u.id === reply.authorUserId), [], authors)),
  };
}

function serializePost(post: FeedPost, media: FeedMedia[], authors: Actor[], commentCount: number, reportCount: number, likeCount: number, viewerHasLiked: boolean) {
  const author = authors.find((u) => u.id === post.authorUserId);
  return {
    id: String(post.id),
    title: post.title,
    body: post.body,
    status: post.status,
    visibility: post.visibility,
    metadata: post.metadata ?? {},
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    archivedAt: post.archivedAt ? post.archivedAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: author ? { id: String(author.id), name: author.name, role: author.role, profileImageUrl: author.profileImageUrl ?? "" } : null,
    media: media.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({
      id: String(item.id),
      postId: String(item.postId),
      type: item.type,
      url: item.url,
      caption: item.caption,
      mimeType: item.mimeType,
      sortOrder: item.sortOrder,
      metadata: item.metadata ?? {},
    })),
    counts: { comments: commentCount, reports: reportCount, likes: likeCount },
    viewer: { hasLiked: viewerHasLiked },
  };
}

router.get("/posts", async (req, res): Promise<void> => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const page = Math.max(1, toNumber(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, toNumber(req.query.limit, 10)));
    const requestedStatus = cleanString(req.query.status).toLowerCase();
    const allPosts = await db.select().from(feedPosts);
    const allMedia = await db.select().from(feedMedia);
    const allUsers = await db.select().from(users);
    const allComments = await db.select().from(feedComments);
    const allReports = await db.select().from(feedReports);
    const allLikes = await db.select().from(feedPostLikes);

    const visible = allPosts
      .filter((post) => actor.role === "admin" ? (!requestedStatus || post.status === requestedStatus) : post.status === "published")
      .sort((a, b) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime());
    const start = (page - 1) * limit;
    const items = visible.slice(start, start + limit).map((post) => serializePost(
      post,
      allMedia.filter((item) => item.postId === post.id),
      allUsers,
      allComments.filter((comment) => comment.postId === post.id && !comment.isDeleted).length,
      allReports.filter((report) => report.postId === post.id).length,
      allLikes.filter((like) => like.postId === post.id).length,
      allLikes.some((like) => like.postId === post.id && like.userId === actor.id),
    ));
    res.json({ success: true, posts: items, pagination: { page, limit, total: visible.length, hasMore: start + limit < visible.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Could not load feed posts." });
  }
});

router.post("/posts", async (req, res): Promise<void> => {
  try {
    const actor = await requireAdmin(req, res);
    if (!actor) return;
    const payload = validatePostPayload(req.body ?? {});
    const now = new Date();
    const [post] = await db.insert(feedPosts).values({
      authorUserId: actor.id,
      title: payload.title,
      body: payload.body,
      status: payload.status,
      visibility: payload.visibility,
      publishedAt: payload.status === "published" ? now : null,
      archivedAt: payload.status === "archived" ? now : null,
      metadata: typeof req.body?.metadata === "object" && req.body.metadata ? req.body.metadata : {},
    }).returning();
    if (payload.media?.length) {
      await db.insert(feedMedia).values(payload.media.map((item) => ({ ...item, postId: post.id })));
    }
    res.status(201).json({ success: true, postId: String(post.id) });
  } catch (error) {
    res.status(error instanceof Error ? 400 : 500).json({ success: false, error: error instanceof Error ? error.message : "Could not create feed post." });
  }
});

router.put("/posts/:id", async (req, res): Promise<void> => {
  try {
    const actor = await requireAdmin(req, res);
    if (!actor) return;
    const id = toNumber(req.params.id, 0);
    if (!id) { clientError(res, 400, "Invalid post id."); return; }
    const [existing] = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
    if (!existing) { clientError(res, 404, "Feed post not found."); return; }
    const payload = validatePostPayload(req.body ?? {}, true);
    const nextStatus = payload.status || existing.status;
    const now = new Date();
    await db.update(feedPosts).set({
      title: payload.title || existing.title,
      body: payload.body || existing.body,
      status: nextStatus,
      visibility: payload.visibility || existing.visibility,
      publishedAt: nextStatus === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
      archivedAt: nextStatus === "archived" ? now : nextStatus === "published" ? null : existing.archivedAt,
      metadata: typeof req.body?.metadata === "object" && req.body.metadata ? req.body.metadata : existing.metadata,
      updatedAt: now,
    }).where(eq(feedPosts.id, id));
    if (payload.media) {
      await db.delete(feedMedia).where(eq(feedMedia.postId, id));
      if (payload.media.length) await db.insert(feedMedia).values(payload.media.map((item) => ({ ...item, postId: id })));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(error instanceof Error ? 400 : 500).json({ success: false, error: error instanceof Error ? error.message : "Could not update feed post." });
  }
});

router.post("/posts/:id/publish", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res);
  if (!actor) return;
  const id = toNumber(req.params.id, 0);
  if (!id) { clientError(res, 400, "Invalid post id."); return; }
  await db.update(feedPosts).set({ status: "published", publishedAt: new Date(), archivedAt: null, updatedAt: new Date() }).where(eq(feedPosts.id, id));
  res.json({ success: true });
});

router.post("/posts/:id/archive", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res);
  if (!actor) return;
  const id = toNumber(req.params.id, 0);
  if (!id) { clientError(res, 400, "Invalid post id."); return; }
  await db.update(feedPosts).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(eq(feedPosts.id, id));
  res.json({ success: true });
});

router.delete("/posts/:id", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res);
  if (!actor) return;
  const id = toNumber(req.params.id, 0);
  if (!id) { clientError(res, 400, "Invalid post id."); return; }
  const comments = await db.select().from(feedComments).where(eq(feedComments.postId, id));
  for (const comment of comments) await db.delete(feedReports).where(eq(feedReports.commentId, comment.id));
  await db.delete(feedReports).where(eq(feedReports.postId, id));
  await db.delete(feedPostLikes).where(eq(feedPostLikes.postId, id));
  await db.delete(feedComments).where(eq(feedComments.postId, id));
  await db.delete(feedMedia).where(eq(feedMedia.postId, id));
  await db.delete(feedPosts).where(eq(feedPosts.id, id));
  res.json({ success: true });
});

router.post("/media", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Media upload failed." });
      return;
    }
    next();
  });
}, async (req, res): Promise<void> => {
  try {
    const actor = await requireAdmin(req, res);
    if (!actor) return;
    if (req.file) {
      const type = req.file.mimetype.startsWith("video/") ? "video" : "image";
      const url = req.protocol + "://" + req.get("host") + "/uploads/feed/" + req.file.filename;
      res.status(201).json({ success: true, media: { id: "uploaded", type, url, caption: cleanString(req.body?.caption), mimeType: req.file.mimetype, sortOrder: 0, metadata: { originalName: req.file.originalname, size: req.file.size } } });
      return;
    }
    const [item] = validateMedia([req.body ?? {}]);
    res.status(201).json({ success: true, media: { ...item, id: "preview" } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Could not validate media." });
  }
});

router.get("/posts/:id/comments", async (req, res): Promise<void> => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const postId = toNumber(req.params.id, 0);
  const post = await ensurePostVisible(postId, actor);
  if (!post) { clientError(res, 404, "Feed post not found."); return; }
  const allComments = (await db.select().from(feedComments).where(eq(feedComments.postId, postId))).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const allUsers = await db.select().from(users);
  const roots = allComments.filter((comment) => !comment.parentCommentId);
  const comments = roots.map((comment) => serializeComment(
    comment,
    allUsers.find((u) => u.id === comment.authorUserId),
    allComments.filter((reply) => reply.parentCommentId === comment.id),
    allUsers,
  ));
  res.json({ success: true, comments });
});

router.post("/posts/:id/comments", async (req, res): Promise<void> => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const postId = toNumber(req.params.id, 0);
    const post = await ensurePostVisible(postId, actor);
    if (!post) { clientError(res, 404, "Feed post not found."); return; }
    const parentCommentId = toNumber(req.body?.parentCommentId, 0) || null;
    if (parentCommentId) {
      const [parent] = await db.select().from(feedComments).where(and(eq(feedComments.id, parentCommentId), eq(feedComments.postId, postId))).limit(1);
      if (!parent || parent.parentCommentId) { clientError(res, 400, "Reply target is not valid."); return; }
    }
    const body = validateCommentBody(req.body?.body);
    const [comment] = await db.insert(feedComments).values({ postId, authorUserId: actor.id, parentCommentId, body }).returning();
    res.status(201).json({ success: true, commentId: String(comment.id) });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Could not add comment." });
  }
});

router.post("/posts/:id/like", async (req, res): Promise<void> => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const postId = toNumber(req.params.id, 0);
    const post = await ensurePostVisible(postId, actor);
    if (!post) { clientError(res, 404, "Feed post not found."); return; }
    const [existing] = await db.select().from(feedPostLikes).where(and(eq(feedPostLikes.postId, postId), eq(feedPostLikes.userId, actor.id))).limit(1);
    let liked = false;
    if (existing) {
      await db.delete(feedPostLikes).where(eq(feedPostLikes.id, existing.id));
    } else {
      await db.insert(feedPostLikes).values({ postId, userId: actor.id });
      liked = true;
    }
    const likes = (await db.select().from(feedPostLikes).where(eq(feedPostLikes.postId, postId))).length;
    res.json({ success: true, liked, likes });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Could not update like." });
  }
});

router.post("/posts/:id/report", async (req, res): Promise<void> => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const postId = toNumber(req.params.id, 0);
    const post = await ensurePostVisible(postId, actor);
    if (!post) { clientError(res, 404, "Feed post not found."); return; }
    const payload = validateReport(req.body ?? {});
    await db.insert(feedReports).values({ reporterUserId: actor.id, postId, commentId: null, ...payload });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Could not submit report." });
  }
});

router.post("/comments/:id/report", async (req, res): Promise<void> => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const commentId = toNumber(req.params.id, 0);
    const [comment] = await db.select().from(feedComments).where(eq(feedComments.id, commentId)).limit(1);
    if (!comment || comment.isDeleted) { clientError(res, 404, "Comment not found."); return; }
    const post = await ensurePostVisible(comment.postId, actor);
    if (!post) { clientError(res, 404, "Feed post not found."); return; }
    const payload = validateReport(req.body ?? {});
    await db.insert(feedReports).values({ reporterUserId: actor.id, postId: null, commentId, ...payload });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Could not submit report." });
  }
});

export default router;
