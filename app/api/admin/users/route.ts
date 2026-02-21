import { requireRole } from "@/lib/authz/require-role";
import { authzErrorResponse } from "@/lib/http/authz-response";
import { listUsers } from "@/lib/services/admin/users";
import { Role } from "@/prisma/generated/client";
import { NextResponse } from "next/server";

const MAX_TAKE = 100;

function parseIntWithFallback(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    await requireRole([Role.ADMIN, Role.JUNIOR_ADMIN]);

    const { searchParams } = new URL(request.url);
    const take = Math.min(Math.max(parseIntWithFallback(searchParams.get("take"), 20), 1), MAX_TAKE);
    const skip = Math.max(parseIntWithFallback(searchParams.get("skip"), 0), 0);
    const showDeactivated = searchParams.get("showDeactivated") === "true";

    const users = await listUsers({ take, skip, showDeactivated });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return authzErrorResponse(error);
  }
}
