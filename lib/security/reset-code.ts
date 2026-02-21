import { createHash, randomInt } from "crypto";

const RESET_CODE_LENGTH = 6;

export function generateResetCode(): string {
  return String(randomInt(0, 10 ** RESET_CODE_LENGTH)).padStart(RESET_CODE_LENGTH, "0");
}

export function getResetCodeTtlMs(): number {
  return 10 * 60 * 1000;
}

export function getResetCodeMaxAttempts(): number {
  return 5;
}

export function hashResetCode(userId: string, code: string): string {
  const pepper = process.env.RESET_CODE_PEPPER ?? "local-reset-code-pepper";
  return createHash("sha256").update(`${pepper}:${userId}:${code}`).digest("hex");
}
