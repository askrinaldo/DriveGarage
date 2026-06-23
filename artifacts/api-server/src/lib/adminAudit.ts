import type { Request } from "express";
import { db, adminAuditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export type AdminAction =
  | "user.deactivate"
  | "user.activate"
  | "billing.tier.change"
  | "user.role.grant"
  | "user.role.revoke"
  | "billing.exemption.grant"
  | "billing.exemption.revoke"
  | "support.session.start"
  | "support.session.end"
  | "support.data.access"
  | "support.file.access"
  | "system.bootstrap.admin";

export interface AdminAuditOptions {
  req: Request;
  action: AdminAction;
  targetType?: string;
  targetUserId?: number;
  targetEmail?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "secret",
  "stripeCustomerId",
  "stripe_customer_id",
  "stripeSubscriptionId",
  "stripe_subscription_id",
  "vippsAgreementId",
  "vipps_agreement_id",
]);

function redactMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = REDACTED_KEYS.has(k) ? "[REDACTED]" : v;
  }
  return out;
}

/**
 * Write an entry to admin_audit_logs.
 * Never throws — failures are logged and swallowed so the calling admin
 * action is not blocked by an audit write error. (fail-open policy)
 * If your security policy prefers fail-closed, throw instead of catching.
 */
export async function logAdminAction(
  opts: AdminAuditOptions,
): Promise<void> {
  const actor = opts.req.userAuth;
  if (!actor) {
    logger.warn("logAdminAction called without req.userAuth — skipping");
    return;
  }

  const safeMetadata = opts.metadata ? redactMetadata(opts.metadata) : null;

  const ipAddress =
    (opts.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    opts.req.socket.remoteAddress ??
    null;

  const userAgent = (opts.req.headers["user-agent"] as string | undefined) ?? null;

  try {
    await db.insert(adminAuditLogsTable).values({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: opts.action,
      targetType: opts.targetType ?? null,
      targetUserId: opts.targetUserId ?? null,
      targetEmail: opts.targetEmail ?? null,
      reason: opts.reason ?? null,
      metadata: safeMetadata,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    logger.error({ err, action: opts.action }, "Failed to write admin audit log");
  }
}
