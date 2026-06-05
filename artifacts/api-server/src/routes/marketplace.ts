import { Router, type IRouter } from "express";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { db, marketplaceListingsTable } from "@workspace/db";
import { parseAuth, requireClubRole } from "../middleware/auth";

const router: IRouter = Router();

// ─── List listings (global or by club) ───────────────────────────────────────
router.get("/marketplace", async (req, res): Promise<void> => {
  const { clubId, q, category } = req.query as Record<string, string>;

  let query = db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.status, "active"))
    .$dynamic();

  if (clubId) {
    query = query.where(
      and(
        eq(marketplaceListingsTable.status, "active"),
        eq(marketplaceListingsTable.clubId, parseInt(clubId, 10))
      )
    );
  }

  if (category) {
    query = query.where(
      and(
        eq(marketplaceListingsTable.status, "active"),
        eq(marketplaceListingsTable.category, category)
      )
    );
  }

  if (q) {
    query = query.where(
      and(
        eq(marketplaceListingsTable.status, "active"),
        or(
          ilike(marketplaceListingsTable.title, `%${q}%`),
          ilike(marketplaceListingsTable.description, `%${q}%`)
        )
      )
    );
  }

  const listings = await query.orderBy(desc(marketplaceListingsTable.createdAt));
  res.json(listings);
});

// ─── Club marketplace ──────────────────────────────────────────────────────
router.get("/clubs/:clubId/marketplace", async (req, res): Promise<void> => {
  const clubId = parseInt(String(req.params.clubId), 10);
  const { status } = req.query as { status?: string };

  let query = db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.clubId, clubId))
    .$dynamic();

  if (status) {
    query = query.where(
      and(
        eq(marketplaceListingsTable.clubId, clubId),
        eq(marketplaceListingsTable.status, status as "active" | "sold" | "reserved" | "removed")
      )
    );
  }

  const listings = await query.orderBy(desc(marketplaceListingsTable.createdAt));
  res.json(listings);
});

// ─── Get single listing ────────────────────────────────────────────────────
router.get("/clubs/:clubId/marketplace/:listingId", async (req, res): Promise<void> => {
  const listingId = parseInt(String(req.params.listingId), 10);
  const clubId = parseInt(String(req.params.clubId), 10);

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(
      and(
        eq(marketplaceListingsTable.id, listingId),
        eq(marketplaceListingsTable.clubId, clubId)
      )
    );

  if (!listing) {
    res.status(404).json({ error: "Annonse ikke funnet" });
    return;
  }
  res.json(listing);
});

// ─── Create listing ────────────────────────────────────────────────────────
router.post(
  "/api/clubs/:clubId/marketplace",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    const {
      title, description, price, condition, category,
      make, model, year, imageUrl, contactInfo, location, isFree,
    } = req.body as {
      title: string;
      description?: string;
      price?: number;
      condition?: "new" | "excellent" | "good" | "fair" | "parts_only";
      category?: string;
      make?: string;
      model?: string;
      year?: number;
      imageUrl?: string;
      contactInfo?: string;
      location?: string;
      isFree?: boolean;
    };

    if (!title?.trim()) {
      res.status(400).json({ error: "Tittel er påkrevd" });
      return;
    }

    const [listing] = await db
      .insert(marketplaceListingsTable)
      .values({
        clubId,
        sellerName: actor.memberName,
        title: title.trim(),
        description: description?.trim() ?? null,
        price: price != null ? String(price) : null,
        condition: condition ?? "good",
        category: category?.trim() ?? null,
        make: make?.trim() ?? null,
        model: model?.trim() ?? null,
        year: year ?? null,
        imageUrl: imageUrl?.trim() ?? null,
        contactInfo: contactInfo?.trim() ?? null,
        location: location?.trim() ?? null,
        isFree: isFree ?? false,
        status: "active",
      })
      .returning();

    res.status(201).json(listing);
  }
);

// ─── Update listing ────────────────────────────────────────────────────────
router.patch(
  "/api/clubs/:clubId/marketplace/:listingId",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const listingId = parseInt(String(req.params.listingId), 10);
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, listingId),
          eq(marketplaceListingsTable.clubId, clubId)
        )
      );

    if (!existing) {
      res.status(404).json({ error: "Annonse ikke funnet" });
      return;
    }

    const isMod = ["owner", "admin", "moderator"].includes(actor.role);
    if (existing.sellerName !== actor.memberName && !isMod) {
      res.status(403).json({ error: "Ingen tilgang" });
      return;
    }

    const { title, description, price, condition, status, imageUrl, contactInfo, isFree } =
      req.body as Partial<{
        title: string;
        description: string;
        price: number;
        condition: "new" | "excellent" | "good" | "fair" | "parts_only";
        status: "active" | "sold" | "reserved" | "removed";
        imageUrl: string;
        contactInfo: string;
        isFree: boolean;
      }>;

    const [updated] = await db
      .update(marketplaceListingsTable)
      .set({
        title: title?.trim() ?? existing.title,
        description: description !== undefined ? description?.trim() ?? null : existing.description,
        price: price != null ? String(price) : existing.price,
        condition: condition ?? existing.condition,
        status: status ?? existing.status,
        imageUrl: imageUrl !== undefined ? imageUrl?.trim() ?? null : existing.imageUrl,
        contactInfo: contactInfo !== undefined ? contactInfo?.trim() ?? null : existing.contactInfo,
        isFree: isFree !== undefined ? isFree : existing.isFree,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceListingsTable.id, listingId))
      .returning();

    res.json(updated);
  }
);

// ─── Delete listing ────────────────────────────────────────────────────────
router.delete(
  "/api/clubs/:clubId/marketplace/:listingId",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const listingId = parseInt(String(req.params.listingId), 10);
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, listingId),
          eq(marketplaceListingsTable.clubId, clubId)
        )
      );

    if (!existing) { res.status(404).json({ error: "Annonse ikke funnet" }); return; }

    const isMod = ["owner", "admin", "moderator"].includes(actor.role);
    if (existing.sellerName !== actor.memberName && !isMod) {
      res.status(403).json({ error: "Ingen tilgang" }); return;
    }

    await db.delete(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, listingId));
    res.json({ ok: true });
  }
);

export default router;
