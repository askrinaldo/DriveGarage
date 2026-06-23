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
import { parseAuth, requireClubRole } from "../middleware/auth";
import { audit } from "../lib/audit";

const router: IRouter = Router();

const ROLE_ORDER: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };

// ─── List posts (members only) ────────────────────────────────────────────────
router.get("/clubs/:clubId/forum/posts", requireClubRole("member"), async (req, res): Promise<void> => {
  const clubId = parseInt(String(req.params.clubId), 10);
  const { category, postType, page = "1", pageSize = "20", memberName } = req.query as Record<string, string>;

  const pg = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(50, parseInt(pageSize, 10) || 20);
  const offset = (pg - 1) * ps;

  const allPosts = await db
    .select()
    .from(forumPostsTable)
    .where(and(eq(forumPostsTable.clubId, clubId), eq(forumPostsTable.isDeleted, 0)))
    .orderBy(desc(forumPostsTable.isPinned), desc(forumPostsTable.createdAt));

  let filtered = allPosts;
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (postType) filtered = filtered.filter((p) => p.postType === postType);

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + ps);

  let likedPostIds: Set<number> = new Set();
  const actorName = memberName ?? req.auth?.memberName;
  if (actorName) {
    const likes = await db
      .select({ postId: forumLikesTable.postId })
      .from(forumLikesTable)
      .where(eq(forumLikesTable.memberName, actorName));
    likedPostIds = new Set(likes.map((l) => l.postId));
  }

  const posts = paginated.map((p) => ({ ...p, liked: likedPostIds.has(p.id) }));
  res.json({ posts, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) });
});

// ─── Get single post (members only) ──────────────────────────────────────────
router.get("/clubs/:clubId/forum/posts/:postId", requireClubRole("member"), async (req, res): Promise<void> => {
  const postId = parseInt(String(req.params.postId), 10);
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

  const actorName = memberName ?? req.auth?.memberName;
  let liked = false;
  if (actorName) {
    const [like] = await db
      .select()
      .from(forumLikesTable)
      .where(and(eq(forumLikesTable.postId, postId), eq(forumLikesTable.memberName, actorName)));
    liked = !!like;
  }

  res.json({ ...post, comments, liked });
});

// ─── Create post — requires member+ (JWT) ────────────────────────────────────
router.post(
  "/clubs/:clubId/forum/posts",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;
    const { category, postType, title, content, imageUrl, videoUrl } = req.body as {
      category?: string;
      postType?: string;
      title?: string;
      content: string;
      imageUrl?: string;
      videoUrl?: string;
    };

    if (!content?.trim()) {
      res.status(400).json({ error: "Innhold er påkrevd" });
      return;
    }

    const [post] = await db
      .insert(forumPostsTable)
      .values({
        clubId,
        memberName: actor.memberName,
        category: (category as "general" | "technical_help" | "restoration" | "meetup" | "parts_for_sale") ?? "general",
        postType: (postType as "text" | "image" | "video" | "project_update" | "maintenance") ?? "text",
        title: title?.trim() || null,
        content: content.trim(),
        imageUrl: imageUrl?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
      })
      .returning();

    // Notify other members
    const members = await db.select().from(clubMembersTable).where(eq(clubMembersTable.clubId, clubId));
    const others = members.filter((m) => m.memberName.toLowerCase() !== actor.memberName.toLowerCase());
    if (others.length > 0) {
      await db.insert(forumNotificationsTable).values(
        others.map((m) => ({
          clubId,
          recipientName: m.memberName,
          senderName: actor.memberName,
          type: "new_post",
          postId: post.id,
          message: `${actor.memberName} delte et nytt innlegg: "${title ?? content.slice(0, 60)}"`,
        }))
      );
    }

    await audit({ clubId, actorName: actor.memberName, action: "forum.post_created", targetType: "post", targetId: post.id, targetName: post.title ?? post.content.slice(0, 40) });
    emitToClub(clubId, "new_post", { ...post, liked: false });
    res.status(201).json({ ...post, liked: false });
  }
);

// ─── Update post (pin/edit) — moderator+ to pin, author to edit content ───────
router.patch(
  "/clubs/:clubId/forum/posts/:postId",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const postId = parseInt(String(req.params.postId), 10);
    const actor = req.auth!;
    const { title, content, isPinned } = req.body as {
      title?: string;
      content?: string;
      isPinned?: number;
    };

    const [existing] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
    if (!existing || existing.clubId !== clubId) {
      res.status(404).json({ error: "Innlegg ikke funnet" });
      return;
    }

    const actorRank = ROLE_ORDER[actor.role] ?? 0;
    const isAuthor = existing.memberName.toLowerCase() === actor.memberName.toLowerCase();
    const isModerator = actorRank >= ROLE_ORDER["moderator"]!;

    // Pin/unpin requires moderator+
    if (typeof isPinned === "number" && !isModerator) {
      res.status(403).json({ error: "Kun moderatorer kan feste innlegg." });
      return;
    }

    // Content edit requires authorship or admin+
    if ((content !== undefined || title !== undefined) && !isAuthor && actorRank < ROLE_ORDER["admin"]!) {
      res.status(403).json({ error: "Du kan bare redigere dine egne innlegg." });
      return;
    }

    const updates: Partial<typeof forumPostsTable.$inferInsert> = { updatedAt: new Date() };
    if (typeof isPinned === "number") updates.isPinned = isPinned;
    if (content !== undefined) updates.content = content.trim();
    if (title !== undefined) updates.title = title?.trim() || null;

    const [updated] = await db.update(forumPostsTable).set(updates).where(eq(forumPostsTable.id, postId)).returning();

    if (typeof isPinned === "number") {
      await audit({ clubId, actorName: actor.memberName, action: isPinned ? "forum.post_pinned" : "forum.post_unpinned", targetType: "post", targetId: postId });
    }

    emitToClub(clubId, "post_updated", updated);
    res.json(updated);
  }
);

// ─── Delete post — moderator+ or own post ─────────────────────────────────────
router.delete(
  "/clubs/:clubId/forum/posts/:postId",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const postId = parseInt(String(req.params.postId), 10);
    const actor = req.auth!;

    const [existing] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
    if (!existing || existing.clubId !== clubId) {
      res.status(404).json({ error: "Innlegg ikke funnet" });
      return;
    }

    const isAuthor = existing.memberName.toLowerCase() === actor.memberName.toLowerCase();
    const isModerator = (ROLE_ORDER[actor.role] ?? 0) >= ROLE_ORDER["moderator"]!;

    if (!isAuthor && !isModerator) {
      res.status(403).json({ error: "Du kan bare slette dine egne innlegg, eller ha moderatortilgang." });
      return;
    }

    await db.update(forumPostsTable).set({ isDeleted: 1 }).where(eq(forumPostsTable.id, postId));
    await audit({ clubId, actorName: actor.memberName, action: "forum.post_deleted", targetType: "post", targetId: postId, targetName: existing.title ?? existing.content.slice(0, 40) });
    emitToClub(clubId, "post_deleted", { postId });
    res.status(204).send();
  }
);

// ─── Like / unlike — requires member+ ────────────────────────────────────────
router.post(
  "/clubs/:clubId/forum/posts/:postId/like",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const postId = parseInt(String(req.params.postId), 10);
    const actor = req.auth!;

    const [existingLike] = await db
      .select()
      .from(forumLikesTable)
      .where(and(eq(forumLikesTable.postId, postId), eq(forumLikesTable.memberName, actor.memberName)));

    let liked: boolean;
    if (existingLike) {
      await db.delete(forumLikesTable).where(eq(forumLikesTable.id, existingLike.id));
      await db.update(forumPostsTable).set({ likesCount: sql`${forumPostsTable.likesCount} - 1` }).where(eq(forumPostsTable.id, postId));
      liked = false;
    } else {
      await db.insert(forumLikesTable).values({ postId, memberName: actor.memberName });
      await db.update(forumPostsTable).set({ likesCount: sql`${forumPostsTable.likesCount} + 1` }).where(eq(forumPostsTable.id, postId));
      liked = true;

      const [post] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
      if (post && post.memberName.toLowerCase() !== actor.memberName.toLowerCase()) {
        await db.insert(forumNotificationsTable).values({
          clubId,
          recipientName: post.memberName,
          senderName: actor.memberName,
          type: "like",
          postId,
          message: `${actor.memberName} likte innlegget ditt`,
        });
      }
    }

    const [updatedPost] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
    emitToClub(clubId, "post_liked", { postId, likesCount: updatedPost?.likesCount ?? 0, liked, memberName: actor.memberName });
    res.json({ liked, likesCount: updatedPost?.likesCount ?? 0 });
  }
);

// ─── Add comment — requires member+ ──────────────────────────────────────────
router.post(
  "/clubs/:clubId/forum/posts/:postId/comments",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const postId = parseInt(String(req.params.postId), 10);
    const actor = req.auth!;
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      res.status(400).json({ error: "Innhold er påkrevd" });
      return;
    }

    const [comment] = await db
      .insert(forumCommentsTable)
      .values({ postId, memberName: actor.memberName, content: content.trim() })
      .returning();

    await db.update(forumPostsTable).set({ commentsCount: sql`${forumPostsTable.commentsCount} + 1` }).where(eq(forumPostsTable.id, postId));

    const [post] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, postId));
    if (post && post.memberName.toLowerCase() !== actor.memberName.toLowerCase()) {
      await db.insert(forumNotificationsTable).values({
        clubId,
        recipientName: post.memberName,
        senderName: actor.memberName,
        type: "comment",
        postId,
        message: `${actor.memberName} kommenterte innlegget ditt: "${content.slice(0, 60)}"`,
      });
    }

    emitToClub(clubId, "new_comment", { postId, comment });
    res.status(201).json(comment);
  }
);

// ─── Delete comment — moderator+ or own comment ───────────────────────────────
router.delete(
  "/clubs/:clubId/forum/comments/:commentId",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const commentId = parseInt(String(req.params.commentId), 10);
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    const [comment] = await db.select().from(forumCommentsTable).where(eq(forumCommentsTable.id, commentId));
    if (!comment) { res.status(404).json({ error: "Kommentar ikke funnet" }); return; }

    const isAuthor = comment.memberName.toLowerCase() === actor.memberName.toLowerCase();
    const isModerator = (ROLE_ORDER[actor.role] ?? 0) >= ROLE_ORDER["moderator"]!;

    if (!isAuthor && !isModerator) {
      res.status(403).json({ error: "Du kan bare slette dine egne kommentarer." });
      return;
    }

    await db.update(forumCommentsTable).set({ isDeleted: 1 }).where(eq(forumCommentsTable.id, commentId));
    await db.update(forumPostsTable)
      .set({ commentsCount: sql`GREATEST(${forumPostsTable.commentsCount} - 1, 0)` })
      .where(eq(forumPostsTable.id, comment.postId));

    await audit({ clubId, actorName: actor.memberName, action: "forum.comment_deleted", targetType: "comment", targetId: commentId });
    res.status(204).send();
  }
);

// ─── Notifications — requires member+ ────────────────────────────────────────
router.get(
  "/clubs/:clubId/notifications",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    const notifications = await db
      .select()
      .from(forumNotificationsTable)
      .where(and(eq(forumNotificationsTable.clubId, clubId), eq(forumNotificationsTable.recipientName, actor.memberName)))
      .orderBy(desc(forumNotificationsTable.createdAt))
      .limit(50);

    res.json(notifications);
  }
);

router.patch(
  "/clubs/:clubId/notifications/read",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    await db
      .update(forumNotificationsTable)
      .set({ isRead: 1 })
      .where(and(eq(forumNotificationsTable.clubId, clubId), eq(forumNotificationsTable.recipientName, actor.memberName)));

    res.json({ ok: true });
  }
);

export default router;
