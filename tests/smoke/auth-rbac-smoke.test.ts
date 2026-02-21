import test from "node:test";
import assert from "node:assert/strict";
import { hasRequiredRole } from "@/lib/authz/rbac";
import { normalizeEmail } from "@/lib/security/email";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { generateResetCode, hashResetCode } from "@/lib/security/reset-code";

test("smoke: register -> login success primitives", async () => {
  const rawEmail = "  USER@Example.COM ";
  const normalized = normalizeEmail(rawEmail);
  assert.equal(normalized, "user@example.com");

  const password = "super-secret-password";
  const passwordHash = await hashPassword(password);
  const ok = await verifyPassword(password, passwordHash);
  assert.equal(ok, true);
});

test("smoke: request reset -> confirm reset primitives", async () => {
  const userId = "user_cuid";
  const code = generateResetCode();
  assert.equal(code.length, 6);

  const storedHash = hashResetCode(userId, code);
  const matchingHash = hashResetCode(userId, code);
  const wrongHash = hashResetCode(userId, "000000");

  assert.equal(storedHash, matchingHash);
  assert.notEqual(storedHash, wrongHash);
});

test("smoke: RBAC USER forbidden / ADMIN allowed", () => {
  assert.equal(hasRequiredRole("USER", ["ADMIN", "JUNIOR_ADMIN"]), false);
  assert.equal(hasRequiredRole("ADMIN", ["ADMIN", "JUNIOR_ADMIN"]), true);
});
