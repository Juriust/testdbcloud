import { createHash } from "crypto";

export function hashKey(scope: string, value: string): string {
  const pepper = process.env.RATE_LIMIT_PEPPER ?? "local-rate-limit-pepper";
  return createHash("sha256").update(`${pepper}:${scope}:${value}`).digest("hex");
}
