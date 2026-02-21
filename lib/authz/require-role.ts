import { authOptions } from "@/auth";
import { hasRequiredRole } from "@/lib/authz/rbac";
import prisma from "@/lib/prisma";
import { Role } from "@/prisma/generated/client";
import { getServerSession } from "next-auth";

export class AuthzError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export type AuthenticatedActor = {
  id: string;
  role: Role;
  email: string;
};

export async function requireRole(allowedRoles: Role[]): Promise<AuthenticatedActor> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthzError(401, "Authentication required");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new AuthzError(401, "Authentication required");
  }

  if (!hasRequiredRole(user.role, allowedRoles)) {
    throw new AuthzError(403, "Forbidden");
  }

  return user;
}
