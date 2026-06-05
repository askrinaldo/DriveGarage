import { Router, type IRouter } from "express";
import { db, chatMessagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { parseUserAuth, requireUser } from "../middleware/userAuth";

const router: IRouter = Router();

const MAX_MESSAGES = 20;

const WELCOME_MESSAGE = {
  role: "assistant" as const,
  content:
    "Hei! Jeg er Vintage Garage-assistenten 🔧 Jeg kan hjelpe deg med kjøretøy, servicelogg, klubber og mer. Hva lurer du på?",
};

router.get("/chat-history", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.userId, req.userAuth!.userId))
    .orderBy(asc(chatMessagesTable.createdAt));

  const messages = rows.map((r) => ({ role: r.role, content: r.content }));

  if (messages.length === 0) {
    res.json({ messages: [WELCOME_MESSAGE] });
    return;
  }

  res.json({ messages });
});

router.post("/chat-history", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { role, content } = req.body as { role?: string; content?: string };

  if ((role !== "user" && role !== "assistant") || !content?.trim()) {
    res.status(400).json({ error: "role (user|assistant) og content er påkrevd" });
    return;
  }

  const userId = req.userAuth!.userId;

  await db.insert(chatMessagesTable).values({ userId, role, content: content.trim() });

  const rows = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.userId, userId))
    .orderBy(asc(chatMessagesTable.createdAt));

  if (rows.length > MAX_MESSAGES) {
    const toDelete = rows.slice(0, rows.length - MAX_MESSAGES);
    for (const row of toDelete) {
      await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, row.id));
    }
  }

  res.status(201).json({ ok: true });
});

router.delete("/chat-history", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  await db
    .delete(chatMessagesTable)
    .where(eq(chatMessagesTable.userId, req.userAuth!.userId));

  res.json({ ok: true });
});

export default router;
