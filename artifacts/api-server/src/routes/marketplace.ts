import { Router, type IRouter } from "express";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import { db, marketplaceListingsTable } from "@workspace/db";
import { parseAuth, requireClubRole } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router: IRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────
const createListingSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(300),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  condition: z.enum(["new", "excellent", "good", "fair", "parts_only"]).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  make: z.string().trim().max(100).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  year: z.number().int().min(1885).max(2100).nullable().optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  contactInfo: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  isFree: z.boolean().optional(),
});

const updateListingSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").trim().optional(),
  description: z.string().trim().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  condition: z.enum(["new", "excellent", "good", "fair", "parts_only"]).optional(),
  status: z.enum(["active", "sold", "reserved", "removed"]).optional(),
  imageUrl: z.string().trim().nullable().optional(),
  contactInfo: z.string().trim().nullable().optional(),
  isFree: z.boolean().optional(),
});

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
  "/clubs/:clubId/marketplace",
  parseAuth,
  requireClubRole("member"),
  validate(createListingSchema),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;
    const {
      title, description, price, condition, category,
      make, model, year, imageUrl, contactInfo, location, isFree,
    } = req.body as z.infer<typeof createListingSchema>;

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
  "/clubs/:clubId/marketplace/:listingId",
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

    const bodyParsed = updateListingSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Ugyldig input", details: bodyParsed.error.issues });
      return;
    }

    const { title, description, price, condition, status, imageUrl, contactInfo, isFree } = bodyParsed.data;

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
  "/clubs/:clubId/marketplace/:listingId",
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
