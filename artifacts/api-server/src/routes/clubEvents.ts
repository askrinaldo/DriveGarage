import { Router, type IRouter } from "express";
import { eq, and, desc, gte, asc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  clubEventsTable,
  clubEventRsvpsTable,
  clubMembersTable,
  forumNotificationsTable,
  clubsTable,
} from "@workspace/db";
import { parseAuth, requireClubRole } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate } from "../middleware/validate";

const router: IRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────
const isoDateString = z
  .string()
  .refine((s) => !isNaN(new Date(s).getTime()), { message: "Ugyldig dato" });

const createClubEventSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(300),
  description: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  startAt: isoDateString,
  endAt: isoDateString.nullable().optional(),
  maxAttendees: z.number().int().positive().nullable().optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
});

const updateClubEventSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").trim().optional(),
  description: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  startAt: z.string().optional(),
  endAt: z.string().nullable().optional(),
  maxAttendees: z.number().int().positive().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  status: z.enum(["upcoming", "ongoing", "cancelled", "past"]).optional(),
});

// ─── List events ─────────────────────────────────────────────────────────────
router.get("/clubs/:clubId/events", parseAuth, async (req, res): Promise<void> => {
  const clubId = parseInt(String(req.params.clubId), 10);

  const [club] = await db
    .select({ isPrivate: clubsTable.isPrivate })
    .from(clubsTable)
    .where(eq(clubsTable.id, clubId));
  if (!club) { res.status(404).json({ error: "Klubb ikke funnet" }); return; }
  if (club.isPrivate) {
    const isMember = req.auth && req.auth.clubId === clubId;
    if (!isMember) { res.status(403).json({ error: "Kun klubbmedlemmer kan se arrangementer." }); return; }
  }

  const { upcoming } = req.query as Record<string, string>;

  let query = db
    .select()
    .from(clubEventsTable)
    .where(eq(clubEventsTable.clubId, clubId))
    .$dynamic();

  if (upcoming === "true") {
    query = query.where(
      and(
        eq(clubEventsTable.clubId, clubId),
        gte(clubEventsTable.startAt, new Date()),
      )
    );
  }

  const events = await query.orderBy(asc(clubEventsTable.startAt));

  const rsvpCounts = await db
    .select({
      eventId: clubEventRsvpsTable.eventId,
      status: clubEventRsvpsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(clubEventRsvpsTable)
    .where(
      sql`${clubEventRsvpsTable.eventId} = any(${sql.raw(
        events.length > 0 ? `ARRAY[${events.map((e) => e.id).join(",")}]` : "ARRAY[]::int[]"
      )})`
    )
    .groupBy(clubEventRsvpsTable.eventId, clubEventRsvpsTable.status);

  const countMap: Record<number, { going: number; maybe: number; not_going: number }> = {};
  for (const row of rsvpCounts) {
    if (!countMap[row.eventId]) countMap[row.eventId] = { going: 0, maybe: 0, not_going: 0 };
    if (row.status === "going") countMap[row.eventId]!.going = row.count;
    else if (row.status === "maybe") countMap[row.eventId]!.maybe = row.count;
    else if (row.status === "not_going") countMap[row.eventId]!.not_going = row.count;
  }

  res.json(
    events.map((e) => ({
      ...e,
      rsvpCounts: countMap[e.id] ?? { going: 0, maybe: 0, not_going: 0 },
    }))
  );
});

// ─── Get single event ────────────────────────────────────────────────────────
router.get("/clubs/:clubId/events/:eventId", parseAuth, async (req, res): Promise<void> => {
  const clubId = parseInt(String(req.params.clubId), 10);
  const eventId = parseInt(String(req.params.eventId), 10);

  const [clubCheck] = await db
    .select({ isPrivate: clubsTable.isPrivate })
    .from(clubsTable)
    .where(eq(clubsTable.id, clubId));
  if (!clubCheck) { res.status(404).json({ error: "Klubb ikke funnet" }); return; }
  if (clubCheck.isPrivate) {
    const isMember = req.auth && req.auth.clubId === clubId;
    if (!isMember) { res.status(403).json({ error: "Kun klubbmedlemmer kan se arrangementer." }); return; }
  }

  const [event] = await db
    .select()
    .from(clubEventsTable)
    .where(and(eq(clubEventsTable.id, eventId), eq(clubEventsTable.clubId, clubId)));

  if (!event) {
    res.status(404).json({ error: "Arrangement ikke funnet" });
    return;
  }

  const rsvps = await db
    .select()
    .from(clubEventRsvpsTable)
    .where(eq(clubEventRsvpsTable.eventId, eventId))
    .orderBy(asc(clubEventRsvpsTable.createdAt));

  const going = rsvps.filter((r) => r.status === "going");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const not_going = rsvps.filter((r) => r.status === "not_going");

  res.json({
    ...event,
    rsvps,
    rsvpCounts: { going: going.length, maybe: maybe.length, not_going: not_going.length },
  });
});

// ─── Create event — requires member+ ─────────────────────────────────────────
router.post(
  "/clubs/:clubId/events",
  parseAuth,
  requireClubRole("member"),
  validate(createClubEventSchema),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;
    const {
      title, description, location, latitude, longitude,
      startAt, endAt, maxAttendees, imageUrl,
    } = req.body as z.infer<typeof createClubEventSchema>;

    const [event] = await db
      .insert(clubEventsTable)
      .values({
        clubId,
        title: title.trim(),
        description: description?.trim() ?? null,
        location: location?.trim() ?? null,
        latitude: latitude != null ? String(latitude) : null,
        longitude: longitude != null ? String(longitude) : null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        createdBy: actor.memberName,
        maxAttendees: maxAttendees ?? null,
        imageUrl: imageUrl?.trim() ?? null,
        status: "upcoming",
      })
      .returning();

    await audit({ clubId, actorName: actor.memberName, action: "event.created", targetType: "event", targetId: event!.id, targetName: title.trim() });

    const members = await db
      .select()
      .from(clubMembersTable)
      .where(eq(clubMembersTable.clubId, clubId));

    const others = members.filter(
      (m) => m.memberName.toLowerCase() !== actor.memberName.toLowerCase()
    );
    if (others.length > 0) {
      await db.insert(forumNotificationsTable).values(
        others.map((m) => ({
          clubId,
          recipientName: m.memberName,
          senderName: actor.memberName,
          type: "event_invite",
          message: `${actor.memberName} har opprettet et nytt arrangement: "${title.trim()}"`,
        }))
      );
    }

    res.status(201).json(event);
  }
);

// ─── Update event — requires moderator+ or creator ───────────────────────────
router.patch(
  "/clubs/:clubId/events/:eventId",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const eventId = parseInt(String(req.params.eventId), 10);
    const actor = req.auth!;

    const [existing] = await db
      .select()
      .from(clubEventsTable)
      .where(and(eq(clubEventsTable.id, eventId), eq(clubEventsTable.clubId, clubId)));

    if (!existing) {
      res.status(404).json({ error: "Arrangement ikke funnet" });
      return;
    }

    const isMod = ["owner", "admin", "moderator"].includes(actor.role);
    if (existing.createdBy !== actor.memberName && !isMod) {
      res.status(403).json({ error: "Ingen tilgang til å redigere dette arrangementet" });
      return;
    }

    const bodyParsed = updateClubEventSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Ugyldig input", details: bodyParsed.error.issues });
      return;
    }

    const {
      title, description, location, latitude, longitude,
      startAt, endAt, maxAttendees, imageUrl, status,
    } = bodyParsed.data;

    const [updated] = await db
      .update(clubEventsTable)
      .set({
        title: title?.trim() ?? existing.title,
        description: description !== undefined ? description?.trim() ?? null : existing.description,
        location: location !== undefined ? location?.trim() ?? null : existing.location,
        latitude: latitude != null ? String(latitude) : existing.latitude,
        longitude: longitude != null ? String(longitude) : existing.longitude,
        startAt: startAt ? new Date(startAt) : existing.startAt,
        endAt: endAt ? new Date(endAt) : existing.endAt,
        maxAttendees: maxAttendees ?? existing.maxAttendees,
        imageUrl: imageUrl !== undefined ? imageUrl?.trim() ?? null : existing.imageUrl,
        status: status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(clubEventsTable.id, eventId))
      .returning();

    await audit({ clubId, actorName: actor.memberName, action: "event.updated", targetType: "event", targetId: eventId, targetName: existing.title });
    res.json(updated);
  }
);

// ─── Delete event — requires moderator+ or creator ───────────────────────────
router.delete(
  "/clubs/:clubId/events/:eventId",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const eventId = parseInt(String(req.params.eventId), 10);
    const actor = req.auth!;

    const [existing] = await db
      .select()
      .from(clubEventsTable)
      .where(and(eq(clubEventsTable.id, eventId), eq(clubEventsTable.clubId, clubId)));

    if (!existing) {
      res.status(404).json({ error: "Arrangement ikke funnet" });
      return;
    }

    const isMod = ["owner", "admin", "moderator"].includes(actor.role);
    if (existing.createdBy !== actor.memberName && !isMod) {
      res.status(403).json({ error: "Ingen tilgang til å slette dette arrangementet" });
      return;
    }

    await db.delete(clubEventsTable).where(eq(clubEventsTable.id, eventId));
    await audit({ clubId, actorName: actor.memberName, action: "event.deleted", targetType: "event", targetId: eventId, targetName: existing.title });
    res.json({ ok: true });
  }
);

// ─── RSVP to event ────────────────────────────────────────────────────────────
router.post(
  "/clubs/:clubId/events/:eventId/rsvp",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const eventId = parseInt(String(req.params.eventId), 10);
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;
    const { status, note } = req.body as { status: "going" | "maybe" | "not_going"; note?: string };

    if (!["going", "maybe", "not_going"].includes(status)) {
      res.status(400).json({ error: "Ugyldig RSVP-status" });
      return;
    }

    const [event] = await db
      .select()
      .from(clubEventsTable)
      .where(and(eq(clubEventsTable.id, eventId), eq(clubEventsTable.clubId, clubId)));

    if (!event) {
      res.status(404).json({ error: "Arrangement ikke funnet" });
      return;
    }

    if (event.status === "cancelled") {
      res.status(400).json({ error: "Kan ikke melde seg på et avlyst arrangement" });
      return;
    }

    const [existing] = await db
      .select()
      .from(clubEventRsvpsTable)
      .where(
        and(
          eq(clubEventRsvpsTable.eventId, eventId),
          eq(clubEventRsvpsTable.memberName, actor.memberName)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(clubEventRsvpsTable)
        .set({ status, note: note?.trim() ?? null, updatedAt: new Date() })
        .where(eq(clubEventRsvpsTable.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(clubEventRsvpsTable)
        .values({ eventId, memberName: actor.memberName, status, note: note?.trim() ?? null })
        .returning();
      res.status(201).json(created);
    }
  }
);

// ─── Cancel my RSVP ─────────────────────────────────────────────────────────
router.delete(
  "/clubs/:clubId/events/:eventId/rsvp",
  parseAuth,
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const eventId = parseInt(String(req.params.eventId), 10);
    const actor = req.auth!;

    await db
      .delete(clubEventRsvpsTable)
      .where(
        and(
          eq(clubEventRsvpsTable.eventId, eventId),
          eq(clubEventRsvpsTable.memberName, actor.memberName)
        )
      );
    res.json({ ok: true });
  }
);

export default router;
