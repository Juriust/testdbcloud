import prisma from "@/lib/prisma";
import { hashKey } from "@/lib/security/hash";

type RateLimitRule = {
  scope: string;
  max: number;
  windowMs: number;
  blockMs?: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export class RateLimitExceededError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function toRetrySeconds(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000));
}

export async function enforceRateLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const now = new Date();
  const keyHash = hashKey(rule.scope, identifier);

  return prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({
      where: {
        scope_keyHash: {
          scope: rule.scope,
          keyHash,
        },
      },
    });

    if (!bucket) {
      await tx.rateLimitBucket.create({
        data: {
          scope: rule.scope,
          keyHash,
          hits: 1,
          windowStart: now,
        },
      });
      return { allowed: true };
    }

    if (bucket.blockedUntil && bucket.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: toRetrySeconds(bucket.blockedUntil, now),
      };
    }

    const elapsedMs = now.getTime() - bucket.windowStart.getTime();
    if (elapsedMs >= rule.windowMs) {
      await tx.rateLimitBucket.update({
        where: { id: bucket.id },
        data: {
          hits: 1,
          windowStart: now,
          blockedUntil: null,
        },
      });
      return { allowed: true };
    }

    const nextHits = bucket.hits + 1;
    if (nextHits > rule.max) {
      const blockedUntil = new Date(now.getTime() + (rule.blockMs ?? rule.windowMs));
      await tx.rateLimitBucket.update({
        where: { id: bucket.id },
        data: {
          hits: nextHits,
          blockedUntil,
        },
      });
      return {
        allowed: false,
        retryAfterSeconds: toRetrySeconds(blockedUntil, now),
      };
    }

    await tx.rateLimitBucket.update({
      where: { id: bucket.id },
      data: {
        hits: nextHits,
      },
    });

    return { allowed: true };
  });
}

export async function assertRateLimit(identifier: string, rule: RateLimitRule): Promise<void> {
  const result = await enforceRateLimit(identifier, rule);
  if (!result.allowed) {
    throw new RateLimitExceededError(result.retryAfterSeconds ?? 60);
  }
}

export const rateLimitRules = {
  loginByIp: {
    scope: "login:ip",
    max: 10,
    windowMs: 10 * 60 * 1000,
  } satisfies RateLimitRule,
  loginByAccount: {
    scope: "login:account",
    max: 5,
    windowMs: 10 * 60 * 1000,
  } satisfies RateLimitRule,
  resetRequestByIp: {
    scope: "reset-request:ip",
    max: 10,
    windowMs: 10 * 60 * 1000,
    blockMs: 60 * 1000,
  } satisfies RateLimitRule,
  resetRequestByAccount: {
    scope: "reset-request:account",
    max: 1,
    windowMs: 60 * 1000,
    blockMs: 60 * 1000,
  } satisfies RateLimitRule,
  resetConfirmByIp: {
    scope: "reset-confirm:ip",
    max: 15,
    windowMs: 10 * 60 * 1000,
  } satisfies RateLimitRule,
  resetConfirmByAccount: {
    scope: "reset-confirm:account",
    max: 6,
    windowMs: 10 * 60 * 1000,
    blockMs: 5 * 60 * 1000,
  } satisfies RateLimitRule,
} as const;
