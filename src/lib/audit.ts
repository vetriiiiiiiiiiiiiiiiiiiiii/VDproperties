import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function audit(entry: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  try {
    await db.auditEvent.create({ data: entry });
  } catch (err) {
    console.error("Failed to write audit event", err);
  }
}
