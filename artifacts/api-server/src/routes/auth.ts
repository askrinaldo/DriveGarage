import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubMembersTable, auditLogsTable } from "@workspace/db";
import { signClubToken, requireClubRole, parseAuth } from "../middleware/auth";
import { audit } from "../lib/audit";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

/**
 * POST /api/auth/club-session
 * Exchange memberName + clubId for a signed JWT.
 */
router.post("/auth/club-session", async (req, res): Promise<void> => {
  const { memberName, clubId } = req.body as { memberName: string; clubId: number };

  if (!memberName?.trim() || !clubId) {
    res.status(400).json({ error: "memberName og clubId er påkrevd" });
    return;
  }

  const [member] = await db
    .select()
    .from(clubMembersTable)
    .where(
      and(
        eq(clubMembersTable.clubId, clubId),
        eq(clubMembersTable.memberName, memberName.trim())
      )
    );

  if (!member) {
    res.status(401).json({ error: "Du er ikke medlem av denne klubben." });
    return;
  }

  const role = member.role ?? "member";
  const token = signClubToken({
    memberName: member.memberName,
    clubId,
    role,
  });

  await audit({
    clubId,
    actorName: member.memberName,
    action: "auth.login",
    metadata: { role },
  });

  res.json({ token, role, memberName: member.memberName });
});

/**
 * GET /api/auth/me?clubId=...
 * Returns current authenticated member info from JWT.
 */
router.get("/auth/me", parseAuth, async (req, res): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: "Ikke autentisert" });
    return;
  }

  const { memberName, clubId, role } = req.auth;

  // Re-verify membership
  const [member] = await db
    .select()
    .from(clubMembersTable)
    .where(
      and(
        eq(clubMembersTable.clubId, clubId),
        eq(clubMembersTable.memberName, memberName)
      )
    );

  if (!member) {
    res.status(401).json({ error: "Medlemskap ikke funnet" });
    return;
  }

  res.json({ memberName: member.memberName, clubId, role: member.role ?? "member" });
});

/**
 * GET /api/clubs/:clubId/audit-log
 * Returns recent audit log entries. Requires admin or owner.
 */
router.get(
  "/clubs/:clubId/audit-log",
  parseAuth,
  requireClubRole("admin"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.clubId, clubId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(100);

    res.json(logs);
  }
);

export default router;
