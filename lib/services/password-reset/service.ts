import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { deliverPasswordResetCodeByEmail } from "@/lib/mailer/dev-mailer";
import { normalizeEmail } from "@/lib/security/email";
import { hashPassword, validatePasswordStrength } from "@/lib/security/password";
import {
  assertRateLimit,
  rateLimitRules,
  RateLimitExceededError,
} from "@/lib/security/rate-limit";
import {
  generateResetCode,
  getResetCodeMaxAttempts,
  getResetCodeTtlMs,
  hashResetCode,
} from "@/lib/security/reset-code";
import { AuditEvent, ResetCodeIssuer, Role } from "@/prisma/generated/client";

const GENERIC_RESET_RESPONSE = {
  ok: true,
  message: "If an account exists, a reset code will be sent.",
};

export type RequestCodeResult = typeof GENERIC_RESET_RESPONSE;

export type ConfirmPasswordResetResult = {
  ok: boolean;
  error?: "invalid_input" | "invalid_code" | "rate_limited";
  retryAfterSeconds?: number;
};

async function invalidateActiveCodesForUser(userId: string, now: Date): Promise<void> {
  await prisma.passwordResetCode.updateMany({
    where: {
      userId,
      consumedAt: null,
      invalidatedAt: null,
    },
    data: {
      invalidatedAt: now,
    },
  });
}

export async function issueResetCodeForUser(input: {
  userId: string;
  issuedBy: ResetCodeIssuer;
  issuedByUserId?: string | null;
}): Promise<{ code: string; expiresAt: Date }> {
  const code = generateResetCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getResetCodeTtlMs());
  const codeHash = hashResetCode(input.userId, code);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetCode.updateMany({
      where: {
        userId: input.userId,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: now,
      },
    });

    await tx.passwordResetCode.create({
      data: {
        userId: input.userId,
        codeHash,
        expiresAt,
        issuedBy: input.issuedBy,
        issuedByUserId: input.issuedByUserId ?? null,
      },
    });
  });

  const event = input.issuedBy === ResetCodeIssuer.EMAIL
    ? AuditEvent.RESET_CODE_ISSUED
    : AuditEvent.ADMIN_RESET_ISSUED;

  await writeAuditLog({
    event,
    actorUserId: input.issuedByUserId ?? null,
    targetUserId: input.userId,
    metadata: {
      issuedBy: input.issuedBy,
    },
  });

  return { code, expiresAt };
}

export async function requestPasswordResetCode(input: {
  email: string;
  ipAddress: string;
}): Promise<RequestCodeResult> {
  const normalizedEmail = normalizeEmail(input.email);

  try {
    await assertRateLimit(input.ipAddress, rateLimitRules.resetRequestByIp);
    await assertRateLimit(normalizedEmail, rateLimitRules.resetRequestByAccount);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return GENERIC_RESET_RESPONSE;
    }
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return GENERIC_RESET_RESPONSE;
  }

  const { code } = await issueResetCodeForUser({
    userId: user.id,
    issuedBy: ResetCodeIssuer.EMAIL,
  });

  await deliverPasswordResetCodeByEmail(user.email, code);
  return GENERIC_RESET_RESPONSE;
}

export async function confirmPasswordReset(input: {
  email: string;
  code: string;
  newPassword: string;
  ipAddress: string;
}): Promise<ConfirmPasswordResetResult> {
  if (!input.email || !input.code || !input.newPassword) {
    return { ok: false, error: "invalid_input" };
  }

  if (!validatePasswordStrength(input.newPassword)) {
    return { ok: false, error: "invalid_input" };
  }

  const normalizedEmail = normalizeEmail(input.email);

  try {
    await assertRateLimit(input.ipAddress, rateLimitRules.resetConfirmByIp);
    await assertRateLimit(normalizedEmail, rateLimitRules.resetConfirmByAccount);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return { ok: false, error: "invalid_code" };
  }

  const now = new Date();
  const activeCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!activeCode) {
    return { ok: false, error: "invalid_code" };
  }

  if (activeCode.attempts >= getResetCodeMaxAttempts()) {
    await prisma.passwordResetCode.update({
      where: {
        id: activeCode.id,
      },
      data: {
        invalidatedAt: now,
      },
    });
    return { ok: false, error: "invalid_code" };
  }

  const submittedCodeHash = hashResetCode(user.id, input.code);
  if (submittedCodeHash !== activeCode.codeHash) {
    const nextAttempts = activeCode.attempts + 1;
    await prisma.passwordResetCode.update({
      where: {
        id: activeCode.id,
      },
      data: {
        attempts: nextAttempts,
        invalidatedAt: nextAttempts >= getResetCodeMaxAttempts() ? now : null,
      },
    });
    return { ok: false, error: "invalid_code" };
  }

  const nextPasswordHash = await hashPassword(input.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: nextPasswordHash,
      },
    });

    await tx.passwordResetCode.update({
      where: {
        id: activeCode.id,
      },
      data: {
        consumedAt: now,
      },
    });

    await tx.passwordResetCode.updateMany({
      where: {
        userId: user.id,
        id: {
          not: activeCode.id,
        },
        consumedAt: null,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: now,
      },
    });
  });

  await writeAuditLog({
    event: AuditEvent.RESET_CODE_CONSUMED,
    targetUserId: user.id,
  });

  return { ok: true };
}

export async function issueAdminResetCode(input: {
  actorUserId: string;
  actorRole: Role;
  targetUserId: string;
}): Promise<{ code: string; expiresAt: Date }> {
  const target = await prisma.user.findFirst({
    where: {
      id: input.targetUserId,
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!target) {
    throw new Error("Target user not found");
  }

  if (input.actorRole === Role.JUNIOR_ADMIN && target.role !== Role.USER) {
    throw new Error("JUNIOR_ADMIN can reset only USER accounts");
  }

  const issuedBy = input.actorRole === Role.ADMIN
    ? ResetCodeIssuer.ADMIN
    : ResetCodeIssuer.JUNIOR_ADMIN;

  return issueResetCodeForUser({
    userId: target.id,
    issuedBy,
    issuedByUserId: input.actorUserId,
  });
}

export async function invalidateAllActiveResetCodes(userId: string): Promise<void> {
  await invalidateActiveCodesForUser(userId, new Date());
}
