import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export interface AuditOptions {
  clubId?: number | null;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: number;
  targetName?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(opts: AuditOptions): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      clubId: opts.clubId ?? null,
      actorName: opts.actorName,
      action: opts.action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      targetName: opts.targetName ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch (err) {
    logger.error({ err, opts }, "Failed to write audit log");
  }
}
