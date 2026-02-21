import { getClientIp } from "@/lib/security/ip";
import { confirmPasswordReset } from "@/lib/services/password-reset/service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    | { email?: string; code?: string; newPassword?: string }
    | null;

  if (!body?.email || !body.code || !body.newPassword) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await confirmPasswordReset({
    email: body.email,
    code: body.code,
    newPassword: body.newPassword,
    ipAddress: getClientIp(request),
  });

  if (!result.ok) {
    const status = result.error === "rate_limited" ? 429 : 400;
    return NextResponse.json(
      {
        error: result.error === "rate_limited" ? "Too many attempts" : "Invalid code or expired code",
      },
      {
        status,
        headers: result.retryAfterSeconds
          ? {
              "Retry-After": String(result.retryAfterSeconds),
            }
          : undefined,
      }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
