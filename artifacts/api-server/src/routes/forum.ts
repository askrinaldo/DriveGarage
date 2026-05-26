import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  forumPostsTable,
  forumCommentsTable,
  forumLikesTable,
  forumNotificationsTable,
  clubMembersTable,
} from "@workspace/db";
import { emitToClub } from "../socket";

const router: IRouter = Router();

// ─── List posts ──────────────────────────────────────────────────────────────
router.get("/clubs/:clubId/forum/posts", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const { category, postType, page = "1", pageSize = "20", memberName } = req.query as Record<string, string>;

  const pg = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(50, parseInt(pageSize, 10) || 20);
  const offset = (pg - 1) * ps;

  let query = db
    .select()
    .from(forumPostsTable)
    .where(
      and(
        eq(forumPostsTable.clubId, clubId),
        eq(forumPostsTable.isDeleted, 0)
      )
    )
    .orderBy(desc(forumPostsTable.isPinned), desc(forumPostsTable.createdAt))
    .$dynamic();

  const allPosts = await query;
  let filtered = allPosts;
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (postType) filtered = filtered.filter((p) => p.postType === postType);

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + ps);

  // Attach liked status if memberName given
  let likedPostIds: Set<number> = new Set();
  if (memberName) {
    const likes = await db
      .select({ postId: forumLikesTable.postId })
      .from(forumLikesTable)
      .where(eq(forumLikesTable.memberName, memberName));
    likedPostIds = new Set(likes.map((l) => l.postId));
  }

  const posts = paginated.map((p) => ({
    ...p,
    liked: likedPostIds.has(p.id),
  }));

  res.json({ posts, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) });
});

// ─── Get single post ─────────────────────────────────────────────────────────
router.get("/clubs/:clubId/forum/posts/:postId", async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const { memberName } = req.query as Record<string, string>;

  const [post] = await db
    .select()
    .from(forumPostsTable)
    .where(and(eq(forumPostsTable.id, postId), eq(forumPostsTable.isDeleted, 0)));

  if (!post) { res.status(404).json({ error: "Innlegg ikke funnet" }); return; }

  const comments = await db
    .select()
    .from(forumCommentsTable)
    .where(and(eq(forumCommentsTable.postId, postId), eq(forumCommentsTable.isDeleted, 0)))
    .orderBy(forumCommentsTable.createdAt);

  let liked = false;
  if (memberName) {
    const [like] = await db
      .select()
      .from(forumLikesTable)
      .where(and(eq(forumLikesTable.postId, postId), eq(forumLikesTable.memberName, memberName)));
    liked = !!like;
  }

  res.json({ ...post, comments, liked });
});

// ─── Create post ─────────────────────────────────────────────────────────────
router.post("/clubs/:clubId/forum/posts", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const { memberName, category, postType, title, content, imageUrl, videoUrl } = req.body as {
    memberName: string;
    category?: string;
    postType?: string;
    title?: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
  };

  if (!memberName?.trim() || !content?.trim()) {
    res.status(400).json({ error: "memberName og content er påkrevd" });
    return;
  }

  // Check membership
  const members = await db.select().from(clubMembersTable).where(eq(clubMembersTable.clubId, clubId));
  const isMember = members.some((m) => m.memberName.toLowerCase() === memberName.trim().toLowerCase());
  if (!isMember) {
    res.status(403).json({ error: "Kun klubbmedlemmer kan poste" });
    return;
  }

  const [post] = await db
    .insert(forumPostsTable)
    .values({
      clubId,
      memberName: memberName.trim(),
      category: (category as "general" | "technical_help" | "restoration" | "meetup" | "parts_for_sale") ?? "general",
      postType: (postType as "text" | "image" | "video" | "project_update" | "maintenance") ?? "text",
      title: title?.trim() || null,
      content: content.trim(),
      imageUrl: imageUrl?.trim() || null,
      videoUrl: videoUrl?.trim() || null,
    })
    .returning();

  // Notify all other members
  const otherMembers = members.filter((m) => m.memberName.toLowerCase() !== memberName.trim().toLowerCase());
  if (otherMembers.length > 0) {
    await db.insert(forumNotificationsTable).values(
      otherMembers.map((m) => ({
        clubId,
        recipientName: m.memberName,
        senderName: memberName.trim(),
        type: "new_post",
        postId: post.id,
        message: `${memberName.trim()} delte et nytt innlegg: "${title ?? content.slice(0, 60)}"`,
      }))
    );
  }

  emitToClub(clubId, "new_post", { ...post, liked: false });
  res.status(201).json({ ...post, liked: false });
});

// ─── Update post (pin/unpin or edit) ─────────────────────────────────────────
router.patch("/clubs/:clubId/forum/posts/:postId", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const postId = parseInt(req.params.postId, 10);
  const { title, content, isPinned, memberName } = req.body as {
    title?: string;
    content?: string;
    isPinned?: number;
    memberName?: string;
  };

  const [existing] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
  if (!existing || existing.clubId !== clubId) {
    res.status(404).json({ error: "Innlegg ikke funnet" });
    return;
  }

  // Only author can edit content; moderator/owner can pin
  const updates: Partial<typeof forumPostsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof isPinned === "number") updates.isPinned = isPinned;
  if (content !== undefined) updates.content = content.trim();
  if (title !== undefined) updates.title = title?.trim() || null;

  const [updated] = await db.update(forumPostsTable).set(updates).where(eq(forumPostsTable.id, postId)).returning();
  emitToClub(clubId, "post_updated", updated);
  res.json(updated);
});

// ─── Delete post ─────────────────────────────────────────────────────────────
router.delete("/clubs/:clubId/forum/posts/:postId", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const postId = parseInt(req.params.postId, 10);

  await db.update(forumPostsTable).set({ isDeleted: 1 }).where(eq(forumPostsTable.id, postId));
  emitToClub(clubId, "post_deleted", { postId });
  res.status(204).send();
});

// ─── Like / unlike post ──────────────────────────────────────────────────────
router.post("/clubs/:clubId/forum/posts/:postId/like", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const postId = parseInt(req.params.postId, 10);
  const { memberName } = req.body as { memberName: string };

  if (!memberName?.trim()) {
    res.status(400).json({ error: "memberName er påkrevd" });
    return;
  }

  const [existing] = await db
    .select()
    .from(forumLikesTable)
    .where(and(eq(forumLikesTable.postId, postId), eq(forumLikesTable.memberName, memberName.trim())));

  let liked: boolean;
  if (existing) {
    // Unlike
    await db.delete(forumLikesTable).where(eq(forumLikesTable.id, existing.id));
    await db.update(forumPostsTable).set({ likesCount: sql`${forumPostsTable.likesCount} - 1` }).where(eq(forumPostsTable.id, postId));
    liked = false;
  } else {
    // Like
    await db.insert(forumLikesTable).values({ postId, memberName: memberName.trim() });
    await db.update(forumPostsTable).set({ likesCount: sql`${forumPostsTable.likesCount} + 1` }).where(eq(forumPostsTable.id, postId));
    liked = true;

    // Notify post author
    const [post] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
    if (post && post.memberName.toLowerCase() !== memberName.trim().toLowerCase()) {
      await db.insert(forumNotificationsTable).values({
        clubId,
        recipientName: post.memberName,
        senderName: memberName.trim(),
        type: "like",
        postId,
        message: `${memberName.trim()} likte innlegget ditt`,
      });
    }
  }

  const [updatedPost] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
  emitToClub(clubId, "post_liked", { postId, likesCount: updatedPost?.likesCount ?? 0, liked, memberName: memberName.trim() });
  res.json({ liked, likesCount: updatedPost?.likesCount ?? 0 });
});

// ─── Add comment ─────────────────────────────────────────────────────────────
router.post("/clubs/:clubId/forum/posts/:postId/comments", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const postId = parseInt(req.params.postId, 10);
  const { memberName, content } = req.body as { memberName: string; content: string };

  if (!memberName?.trim() || !content?.trim()) {
    res.status(400).json({ error: "memberName og content er påkrevd" });
    return;
  }

  const [comment] = await db
    .insert(forumCommentsTable)
    .values({ postId, memberName: memberName.trim(), content: content.trim() })
    .returning();

  await db.update(forumPostsTable).set({ commentsCount: sql`${forumPostsTable.commentsCount} + 1` }).where(eq(forumPostsTable.id, postId));

  // Notify post author
  const [post] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
  if (post && post.memberName.toLowerCase() !== memberName.trim().toLowerCase()) {
    await db.insert(forumNotificationsTable).values({
      clubId,
      recipientName: post.memberName,
      senderName: memberName.trim(),
      type: "comment",
      postId,
      message: `${memberName.trim()} kommenterte innlegget ditt: "${content.slice(0, 60)}"`,
    });
  }

  emitToClub(clubId, "new_comment", { postId, comment });
  res.status(201).json(comment);
});

// ─── Delete comment ───────────────────────────────────────────────────────────
router.delete("/clubs/:clubId/forum/comments/:commentId", async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId, 10);
  const [comment] = await db.select().from(forumCommentsTable).where(eq(forumCommentsTable.id, commentId));
  if (comment) {
    await db.update(forumCommentsTable).set({ isDeleted: 1 }).where(eq(forumCommentsTable.id, commentId));
    await db.update(forumPostsTable).set({ commentsCount: sql`GREATEST(${forumPostsTable.commentsCount} - 1, 0)` }).where(eq(forumPostsTable.id, comment.postId));
  }
  res.status(204).send();
});

// ─── Notifications ────────────────────────────────────────────────────────────
router.get("/clubs/:clubId/notifications", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const { memberName } = req.query as Record<string, string>;
  if (!memberName) { res.status(400).json({ error: "memberName er påkrevd" }); return; }

  const notifications = await db
    .select()
    .from(forumNotificationsTable)
    .where(
      and(
        eq(forumNotificationsTable.clubId, clubId),
        eq(forumNotificationsTable.recipientName, memberName)
      )
    )
    .orderBy(desc(forumNotificationsTable.createdAt))
    .limit(50);

  res.json(notifications);
});

router.patch("/clubs/:clubId/notifications/read", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const { memberName } = req.body as { memberName: string };
  if (!memberName) { res.status(400).json({ error: "memberName er påkrevd" }); return; }

  await db
    .update(forumNotificationsTable)
    .set({ isRead: 1 })
    .where(
      and(
        eq(forumNotificationsTable.clubId, clubId),
        eq(forumNotificationsTable.recipientName, memberName)
      )
    );

  res.json({ ok: true });
});

export default router;
