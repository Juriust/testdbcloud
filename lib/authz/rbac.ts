import { Role } from "@/prisma/generated/client";

export function hasRequiredRole(role: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(role);
}
