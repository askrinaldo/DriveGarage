import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, supportTicketsTable, suggestionsTable } from "@workspace/db";
import { parseUserAuth, requireUser, requireSuperAdmin } from "../middleware/userAuth";

const router: IRouter = Router();

// ─── User: create ticket ───────────────────────────────────────────────────
router.post("/support/tickets", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { title, description, category } = req.body as {
    title?: string;
    description?: string;
    category?: string;
  };

  if (!title?.trim() || !description?.trim()) {
    res.status(400).json({ error: "Tittel og beskrivelse er påkrevd" });
    return;
  }

  const validCategories = ["feil", "spørsmål", "annet"];
  const cat = validCategories.includes(category ?? "") ? category! : "annet";

  const [ticket] = await db
    .insert(supportTicketsTable)
    .values({
      userId: req.userAuth!.userId,
      userEmail: req.userAuth!.email,
      userName: req.userAuth!.name,
      title: title.trim(),
      description: description.trim(),
      category: cat as "feil" | "spørsmål" | "annet",
    })
    .returning();

  res.status(201).json(ticket);
});

// ─── User: get my tickets ─────────────────────────────────────────────────
router.get("/support/tickets", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, req.userAuth!.userId))
    .orderBy(desc(supportTicketsTable.createdAt));

  res.json(tickets);
});

// ─── User: get single ticket ───────────────────────────────────────────────
router.get("/support/tickets/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);

  const [ticket] = await db
    .select()
    .from(supportTicketsTable)
    .where(
      and(
        eq(supportTicketsTable.id, id),
        eq(supportTicketsTable.userId, req.userAuth!.userId)
      )
    );

  if (!ticket) {
    res.status(404).json({ error: "Sak ikke funnet" });
    return;
  }
  res.json(ticket);
});

// ─── User: create suggestion ───────────────────────────────────────────────
router.post("/suggestions", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { title, description, priority } = req.body as {
    title?: string;
    description?: string;
    priority?: string;
  };

  if (!title?.trim() || !description?.trim()) {
    res.status(400).json({ error: "Tittel og beskrivelse er påkrevd" });
    return;
  }

  const validPriorities = ["low", "medium", "high"];
  const prio = validPriorities.includes(priority ?? "") ? priority! : "medium";

  const [suggestion] = await db
    .insert(suggestionsTable)
    .values({
      userId: req.userAuth!.userId,
      userEmail: req.userAuth!.email,
      userName: req.userAuth!.name,
      title: title.trim(),
      description: description.trim(),
      priority: prio as "low" | "medium" | "high",
    })
    .returning();

  res.status(201).json(suggestion);
});

// ─── User: get my suggestions ──────────────────────────────────────────────
router.get("/suggestions", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const suggestions = await db
    .select()
    .from(suggestionsTable)
    .where(eq(suggestionsTable.userId, req.userAuth!.userId))
    .orderBy(desc(suggestionsTable.createdAt));

  res.json(suggestions);
});

// ─── Admin: list all tickets ───────────────────────────────────────────────
router.get("/admin/support/tickets", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .orderBy(desc(supportTicketsTable.createdAt));

  res.json(tickets);
});

// ─── Admin: reply + update ticket status ──────────────────────────────────
router.patch("/admin/support/tickets/:id", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { adminReply, status } = req.body as { adminReply?: string; status?: string };

  const validStatuses = ["open", "answered", "closed"];
  const updates: Partial<typeof supportTicketsTable.$inferInsert> = {};
  if (adminReply !== undefined) {
    updates.adminReply = adminReply;
    updates.repliedAt = new Date();
    if (!status) updates.status = "answered";
  }
  if (status && validStatuses.includes(status)) {
    updates.status = status as "open" | "answered" | "closed";
  }

  const [updated] = await db
    .update(supportTicketsTable)
    .set(updates)
    .where(eq(supportTicketsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Sak ikke funnet" });
    return;
  }
  res.json(updated);
});

// ─── Admin: list all suggestions ──────────────────────────────────────────
router.get("/admin/suggestions", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const suggestions = await db
    .select()
    .from(suggestionsTable)
    .orderBy(desc(suggestionsTable.createdAt));

  res.json(suggestions);
});

// ─── Admin: update suggestion status / note ────────────────────────────────
router.patch("/admin/suggestions/:id", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };

  const validStatuses = ["pending", "reviewed", "implemented", "declined"];
  const updates: Partial<typeof suggestionsTable.$inferInsert> = {};
  if (status && validStatuses.includes(status)) {
    updates.status = status as "pending" | "reviewed" | "implemented" | "declined";
  }
  if (adminNote !== undefined) updates.adminNote = adminNote;

  const [updated] = await db
    .update(suggestionsTable)
    .set(updates)
    .where(eq(suggestionsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Forslag ikke funnet" });
    return;
  }
  res.json(updated);
});

export default router;
