import { AuthzError, requireRole } from "@/lib/authz/require-role";
import { authzErrorResponse } from "@/lib/http/authz-response";
import { issueAdminResetCode } from "@/lib/services/password-reset/service";
import { Role } from "@/prisma/generated/client";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole([Role.ADMIN, Role.JUNIOR_ADMIN]);
    const { id } = await context.params;

    const result = await issueAdminResetCode({
      actorUserId: actor.id,
      actorRole: actor.role,
      targetUserId: id,
    });

    return NextResponse.json(
      {
        code: result.code,
        expiresAt: result.expiresAt.toISOString(),
      },
      { status: 200 }
    );
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
