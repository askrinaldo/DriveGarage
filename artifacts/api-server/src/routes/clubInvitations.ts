import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { db, clubsTable, clubMembersTable, clubInvitationsTable } from "@workspace/db";
import { randomBytes } from "crypto";
import { sendInvitationEmail } from "../lib/mailer";
import { requireClubRole } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate } from "../middleware/validate";

const router: IRouter = Router();

const CreateInvitationSchema = z.object({
  email: z.email().max(254).optional().nullable(),
});

const AcceptInvitationSchema = z.object({
  memberName: z.string().trim().min(1, "Navn er påkrevd").max(100),
});

const DeclineInvitationSchema = z.object({
  memberName: z.string().trim().max(100).optional(),
});

function generateCode(): string {
  return randomBytes(16).toString("hex");
}

function sevenDaysFromNow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

function getBaseUrl(req: { headers: { host?: string }; protocol: string }): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domains) return `https://${domains}`;
  return `${req.protocol}://${req.headers.host}`;
}

// ─── Protected: list invitations — requires admin+ ───────────────────────────
router.get(
  "/clubs/:clubId/invitations",
  requireClubRole("admin"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const invitations = await db
      .select()
      .from(clubInvitationsTable)
      .where(eq(clubInvitationsTable.clubId, clubId))
      .orderBy(clubInvitationsTable.createdAt);
    res.json(invitations);
  }
);

// ─── Protected: create invitation — requires admin+ ───────────────────────────
router.post(
  "/clubs/:clubId/invitations",
  requireClubRole("admin"),
  validate(CreateInvitationSchema),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;
    const body = req.body as z.infer<typeof CreateInvitationSchema>;
    const email = body.email ?? null;

    const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
    if (!club) {
      res.status(404).json({ error: "Klubb ikke funnet" });
      return;
    }

    const code = generateCode();
    const expiresAt = sevenDaysFromNow();

    const [invitation] = await db
      .insert(clubInvitationsTable)
      .values({
        clubId,
        code,
        email,
        createdBy: actor.memberName,
        expiresAt,
        status: "pending",
      })
      .returning();

    const inviteUrl = `${getBaseUrl(req)}/clubs/invite/${code}`;

    let emailSent = false;
    if (email) {
      try {
        emailSent = await sendInvitationEmail({
          to: email,
          clubName: club.name,
          createdBy: actor.memberName,
          inviteUrl,
          expiresAt,
        });
      } catch {
        // e-post feilet, men invitasjonen er fortsatt gyldig
      }
    }

    await audit({
      clubId,
      actorName: actor.memberName,
      action: "invitation.created",
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { email },
    });

    res.status(201).json({ ...invitation, inviteUrl, emailSent });
  }
);

// ─── Protected: revoke invitation — requires admin+ ───────────────────────────
router.delete(
  "/clubs/:clubId/invitations/:invitationId",
  requireClubRole("admin"),
  async (req, res): Promise<void> => {
    const invitationId = parseInt(String(req.params.invitationId), 10);
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    await db
      .update(clubInvitationsTable)
      .set({ status: "revoked" })
      .where(
        and(
          eq(clubInvitationsTable.id, invitationId),
          eq(clubInvitationsTable.clubId, clubId)
        )
      );

    await audit({
      clubId,
      actorName: actor.memberName,
      action: "invitation.revoked",
      targetType: "invitation",
      targetId: invitationId,
    });

    res.status(204).send();
  }
);

// ─── Public: look up invite by code ──────────────────────────────────────────
router.get("/clubs/invite/:code", async (req, res): Promise<void> => {
  const code = String(req.params.code);
  const [invitation] = await db
    .select()
    .from(clubInvitationsTable)
    .where(eq(clubInvitationsTable.code, code));

  if (!invitation) {
    res.status(404).json({ error: "Invitasjon ikke funnet" });
    return;
  }

  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, invitation.clubId));
  if (!club) {
    res.status(404).json({ error: "Klubb ikke funnet" });
    return;
  }

  const now = new Date();
  let status = invitation.status;
  if (status === "pending" && invitation.expiresAt < now) {
    status = "expired";
  }

  res.json({
    code:      invitation.code,
    clubId:    club.id,
    clubName:  club.name,
    clubType:  club.clubType,
    createdBy: invitation.createdBy,
    expiresAt: invitation.expiresAt,
    status,
  });
});

// ─── Public: accept invite ────────────────────────────────────────────────────
router.post(
  "/clubs/invite/:code/accept",
  validate(AcceptInvitationSchema),
  async (req, res): Promise<void> => {
    const code = String(req.params.code);
    const body = req.body as z.infer<typeof AcceptInvitationSchema>;

    const [invitation] = await db
      .select()
      .from(clubInvitationsTable)
      .where(
        and(
          eq(clubInvitationsTable.code, code),
          eq(clubInvitationsTable.status, "pending")
        )
      );

    if (!invitation) {
      res.status(404).json({ error: "Invitasjon ikke funnet" });
      return;
    }

    const now = new Date();
    if (invitation.expiresAt < now) {
      res.status(400).json({ error: "Invitasjonen har utløpt" });
      return;
    }

    const existingMembers = await db
      .select()
      .from(clubMembersTable)
      .where(eq(clubMembersTable.clubId, invitation.clubId));
    const alreadyMember = existingMembers.find(
      (m) => m.memberName.toLowerCase() === body.memberName.trim().toLowerCase()
    );
    if (alreadyMember) {
      res.status(409).json({ error: "Du er allerede medlem av denne klubben" });
      return;
    }

    const [member] = await db
      .insert(clubMembersTable)
      .values({
        clubId:     invitation.clubId,
        memberName: body.memberName.trim(),
        role:       "member",
      })
      .returning();

    await db
      .update(clubInvitationsTable)
      .set({ status: "accepted", usedAt: now, usedBy: body.memberName.trim() })
      .where(eq(clubInvitationsTable.id, invitation.id));

    await audit({
      clubId:   invitation.clubId,
      actorName: body.memberName.trim(),
      action:   "invitation.accepted",
      metadata: { invitationId: invitation.id },
    });

    res.json(member);
  }
);

// ─── Public: decline invite ───────────────────────────────────────────────────
router.post(
  "/clubs/invite/:code/decline",
  validate(DeclineInvitationSchema),
  async (req, res): Promise<void> => {
    const code = String(req.params.code);
    const body = req.body as z.infer<typeof DeclineInvitationSchema>;

    const [invitation] = await db
      .select()
      .from(clubInvitationsTable)
      .where(
        and(
          eq(clubInvitationsTable.code, code),
          eq(clubInvitationsTable.status, "pending")
        )
      );

    if (!invitation) {
      res.status(404).json({ error: "Invitasjon ikke funnet" });
      return;
    }

    const now = new Date();
    if (invitation.expiresAt < now) {
      res.status(400).json({ error: "Invitasjonen har utløpt" });
      return;
    }

    await db
      .update(clubInvitationsTable)
      .set({ status: "declined", usedAt: now, usedBy: body.memberName?.trim() ?? null })
      .where(eq(clubInvitationsTable.id, invitation.id));

    res.json({ message: "Invitasjon avslått" });
  }
);

export default router;
