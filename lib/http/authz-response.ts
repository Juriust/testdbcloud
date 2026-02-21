import { AuthzError } from "@/lib/authz/require-role";
import { NextResponse } from "next/server";

export function authzErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthzError) {
    return NextResponse.json(
      { error: error.status === 401 ? "Authentication required" : "Forbidden" },
      { status: error.status }
    );
  }

  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
