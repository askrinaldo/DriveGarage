import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  clubsTable,
  clubMembersTable,
  clubJoinRequestsTable,
  forumNotificationsTable,
} from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { validate } from "../middleware/validate";
import { audit } from "../lib/audit";
import { AppError } from "../lib/errors";

const router: IRouter = Router();

const ADMIN_ROLES = new Set(["owner", "admin"]);

async function requireAdminByClerk(
  clubId: number,
  memberName: string,
): Promise<void> {
  const [membership] = await db
    .select({ role: clubMembersTable.role })
    .from(clubMembersTable)
    .where(
      and(
        eq(clubMembersTable.clubId, clubId),
        eq(clubMembersTable.memberName, memberName),
      ),
    );
  if (!membership || !ADMIN_ROLES.has(membership.role)) {
    throw new AppError(403, "Kun administratorer kan gjøre dette");
  }
}

const SendRequestSchema = z.object({
  message: z.string().trim().max(300).optional().nullable(),
});

const ReviewRequestSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

// ─── Send join request — Clerk auth ──────────────────────────────────────────
router.post(
  "/clubs/:clubId/join-request",
  parseUserAuth,
  requireUser,
  validate(SendRequestSchema),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const memberName = req.userAuth!.name || req.userAuth!.email;
    const body = req.body as z.infer<typeof SendRequestSchema>;

    const [club] = await db
      .select()
      .from(clubsTable)
      .where(eq(clubsTable.id, clubId));
    if (!club) throw new AppError(404, "Klubb ikke funnet");

    if (club.joinMode !== "invite_only") {
      throw new AppError(
        400,
        "Denne klubben har åpen innmelding — bruk bli-med-knappen.",
      );
    }

    const [alreadyMember] = await db
      .select({ id: clubMembersTable.id })
      .from(clubMembersTable)
      .where(
        and(
          eq(clubMembersTable.clubId, clubId),
          eq(clubMembersTable.memberName, memberName),
        ),
      );
    if (alreadyMember) throw new AppError(409, "Du er allerede medlem av denne klubben");

    const [pendingReq] = await db
      .select({ id: clubJoinRequestsTable.id })
      .from(clubJoinRequestsTable)
      .where(
        and(
          eq(clubJoinRequestsTable.clubId, clubId),
          eq(clubJoinRequestsTable.memberName, memberName),
          eq(clubJoinRequestsTable.status, "pending"),
        ),
      );
    if (pendingReq) throw new AppError(409, "Du har allerede en ventende forespørsel");

    const [joinRequest] = await db
      .insert(clubJoinRequestsTable)
      .values({
        clubId,
        memberName,
        message: body.message ?? null,
        status: "pending",
      })
      .returning();

    const adminOwners = await db
      .select({ memberName: clubMembersTable.memberName, role: clubMembersTable.role })
      .from(clubMembersTable)
      .where(eq(clubMembersTable.clubId, clubId))
      .then((rows) => rows.filter((r) => ADMIN_ROLES.has(r.role ?? "")));

    if (adminOwners.length > 0) {
      await db.insert(forumNotificationsTable).values(
        adminOwners.map((r) => ({
          clubId,
          recipientName: r.memberName,
          senderName: memberName,
          type: "join_request" as const,
          message: `${memberName} ønsker å bli med i klubben`,
          isRead: 0,
        })),
      );
    }

    await audit({
      clubId,
      actorName: memberName,
      action: "join_request.sent",
      targetType: "club",
      targetId: clubId,
      targetName: club.name,
    });

    res.status(201).json(joinRequest);
  },
);

// ─── Get my request status — Clerk auth ──────────────────────────────────────
router.get(
  "/clubs/:clubId/my-join-request",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const memberName = req.userAuth!.name || req.userAuth!.email;

    const [request] = await db
      .select()
      .from(clubJoinRequestsTable)
      .where(
        and(
          eq(clubJoinRequestsTable.clubId, clubId),
          eq(clubJoinRequestsTable.memberName, memberName),
        ),
      )
      .orderBy(clubJoinRequestsTable.createdAt);

    res.json(request ?? null);
  },
);

// ─── List all join requests — Clerk auth + admin role check ──────────────────
router.get(
  "/clubs/:clubId/join-requests",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const memberName = req.userAuth!.name || req.userAuth!.email;

    await requireAdminByClerk(clubId, memberName);

    const requests = await db
      .select()
      .from(clubJoinRequestsTable)
      .where(eq(clubJoinRequestsTable.clubId, clubId))
      .orderBy(clubJoinRequestsTable.createdAt);

    res.json(requests);
  },
);

// ─── Accept or decline a request — Clerk auth + admin role check ─────────────
router.patch(
  "/clubs/:clubId/join-requests/:requestId",
  parseUserAuth,
  requireUser,
  validate(ReviewRequestSchema),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const requestId = parseInt(String(req.params.requestId), 10);
    const memberName = req.userAuth!.name || req.userAuth!.email;
    const { action } = req.body as z.infer<typeof ReviewRequestSchema>;

    await requireAdminByClerk(clubId, memberName);

    const [joinRequest] = await db
      .select()
      .from(clubJoinRequestsTable)
      .where(
        and(
          eq(clubJoinRequestsTable.id, requestId),
          eq(clubJoinRequestsTable.clubId, clubId),
        ),
      );
    if (!joinRequest) throw new AppError(404, "Forespørsel ikke funnet");
    if (joinRequest.status !== "pending") {
      throw new AppError(409, "Forespørselen er allerede behandlet");
    }

    const now = new Date();

    if (action === "accept") {
      const [alreadyMember] = await db
        .select({ id: clubMembersTable.id })
        .from(clubMembersTable)
        .where(
          and(
            eq(clubMembersTable.clubId, clubId),
            eq(clubMembersTable.memberName, joinRequest.memberName),
          ),
        );
      if (!alreadyMember) {
        await db.insert(clubMembersTable).values({
          clubId,
          memberName: joinRequest.memberName,
          role: "member",
        });
      }
      await db.insert(forumNotificationsTable).values({
        clubId,
        recipientName: joinRequest.memberName,
        senderName: memberName,
        type: "join_request_accepted",
        message: "Forespørselen din om å bli med ble godkjent",
        isRead: 0,
      });
    } else {
      await db.insert(forumNotificationsTable).values({
        clubId,
        recipientName: joinRequest.memberName,
        senderName: memberName,
        type: "join_request_declined",
        message: "Forespørselen din om å bli med ble avslått",
        isRead: 0,
      });
    }

    const [updated] = await db
      .update(clubJoinRequestsTable)
      .set({
        status: action === "accept" ? "accepted" : "declined",
        reviewedBy: memberName,
        reviewedAt: now,
      })
      .where(eq(clubJoinRequestsTable.id, requestId))
      .returning();

    await audit({
      clubId,
      actorName: memberName,
      action:
        action === "accept"
          ? "join_request.accepted"
          : "join_request.declined",
      targetType: "member",
      targetName: joinRequest.memberName,
    });

    res.json(updated);
  },
);

export default router;
