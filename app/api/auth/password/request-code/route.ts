import { getClientIp } from "@/lib/security/ip";
import { requestPasswordResetCode } from "@/lib/services/password-reset/service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null;

  if (!body?.email) {
    return NextResponse.json(
      { ok: true, message: "If an account exists, a reset code will be sent." },
      { status: 200 }
    );
  }

  const result = await requestPasswordResetCode({
    email: body.email,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(result, { status: 200 });
}
