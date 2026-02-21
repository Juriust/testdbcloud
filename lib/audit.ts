import prisma from "@/lib/prisma";
import { AuditEvent, Prisma } from "@/prisma/generated/client";

export async function writeAuditLog(input: {
  event: AuditEvent;
  actorUserId?: string | null;
  targetUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      event: input.event,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      metadata: input.metadata,
    },
  });
}
