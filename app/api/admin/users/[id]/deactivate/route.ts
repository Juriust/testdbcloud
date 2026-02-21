import { AuthzError, requireRole } from "@/lib/authz/require-role";
import { authzErrorResponse } from "@/lib/http/authz-response";
import { deactivateUser } from "@/lib/services/admin/users";
import { Role } from "@/prisma/generated/client";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole([Role.ADMIN]);
    const { id } = await context.params;

    await deactivateUser({
      actorUserId: actor.id,
      targetUserId: id,
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
