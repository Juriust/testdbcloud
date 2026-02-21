import { AuthzError, requireRole } from "@/lib/authz/require-role";
import { listUsers } from "@/lib/services/admin/users";
import { Role } from "@/prisma/generated/client";
import { redirect } from "next/navigation";
import AdminUsersClient, { AdminUserRow } from "./users-client";

function parseIntWithFallback(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ showDeactivated?: string; take?: string; skip?: string }>;
}) {
  let actor;
  try {
    actor = await requireRole([Role.ADMIN, Role.JUNIOR_ADMIN]);
  } catch (error) {
    if (error instanceof AuthzError && error.status === 401) {
      redirect("/login");
    }
    redirect("/");
  }

  const params = await searchParams;
  const showDeactivated = params.showDeactivated === "true";
  const take = Math.min(Math.max(parseIntWithFallback(params.take, 20), 1), 100);
  const skip = Math.max(parseIntWithFallback(params.skip, 0), 0);

  const users = await listUsers({
    showDeactivated,
    take,
    skip,
  });

  const initialUsers: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
  }));

  return (
    <AdminUsersClient
      actorRole={actor.role}
      actorId={actor.id}
      initialUsers={initialUsers}
      showDeactivated={showDeactivated}
      take={take}
      skip={skip}
    />
  );
}
