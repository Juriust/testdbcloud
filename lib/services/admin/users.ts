import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { AuditEvent, Role } from "@/prisma/generated/client";

async function ensureActiveAdminRemains(excludingUserId?: string): Promise<void> {
  const activeAdmins = await prisma.user.count({
    where: {
      role: Role.ADMIN,
      deletedAt: null,
      id: excludingUserId ? { not: excludingUserId } : undefined,
    },
  });

  if (activeAdmins < 1) {
    throw new Error("At least one active ADMIN must remain");
  }
}

export async function listUsers(input: {
  take: number;
  skip: number;
  showDeactivated: boolean;
}) {
  return prisma.user.findMany({
    where: input.showDeactivated ? undefined : { deletedAt: null },
    orderBy: {
      createdAt: "desc",
    },
    take: input.take,
    skip: input.skip,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      deletedAt: true,
    },
  });
}

export async function changeUserRole(input: {
  actorUserId: string;
  targetUserId: string;
  role: Role;
}): Promise<void> {
  const [actor, target] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: input.actorUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        id: input.targetUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    }),
  ]);

  if (!actor || !target) {
    throw new Error("User not found");
  }

  if (actor.id === target.id && input.role !== Role.ADMIN) {
    throw new Error("Self-demotion is not allowed");
  }

  if (target.role === Role.ADMIN && input.role !== Role.ADMIN) {
    await ensureActiveAdminRemains(target.id);
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      role: input.role,
    },
  });

  await writeAuditLog({
    event: AuditEvent.ROLE_CHANGED,
    actorUserId: actor.id,
    targetUserId: target.id,
    metadata: {
      role: input.role,
    },
  });
}

export async function deactivateUser(input: {
  actorUserId: string;
  targetUserId: string;
}): Promise<void> {
  const [actor, target] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: input.actorUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        id: input.targetUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    }),
  ]);

  if (!actor || !target) {
    throw new Error("User not found");
  }

  if (actor.id === target.id) {
    throw new Error("Self-deactivation is not allowed");
  }

  if (target.role === Role.ADMIN) {
    await ensureActiveAdminRemains(target.id);
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: target.id,
      },
      data: {
        deletedAt: now,
      },
    });

    await tx.passwordResetCode.updateMany({
      where: {
        userId: target.id,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: now,
      },
    });
  });

  await writeAuditLog({
    event: AuditEvent.USER_DEACTIVATED,
    actorUserId: actor.id,
    targetUserId: target.id,
  });
}
