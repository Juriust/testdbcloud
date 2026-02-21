import { AuthzError, requireRole } from "@/lib/authz/require-role";
import { authzErrorResponse } from "@/lib/http/authz-response";
import { changeUserRole } from "@/lib/services/admin/users";
import { Role } from "@/prisma/generated/client";
import { NextResponse } from "next/server";

function parseRole(role: string): Role | null {
  if (role === Role.USER || role === Role.ADMIN || role === Role.JUNIOR_ADMIN) {
    return role;
  }
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole([Role.ADMIN]);
    const { id } = await context.params;

    const body = await request.json().catch(() => null) as { role?: string } | null;
    const role = body?.role ? parseRole(body.role) : null;
    if (!role) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await changeUserRole({
      actorUserId: actor.id,
      targetUserId: id,
      role,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthzError) {
      return authzErrorResponse(error);
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
