import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/security/email";
import { hashPassword, validatePasswordStrength } from "@/lib/security/password";
import { Role } from "@/prisma/generated/client";
import { NextResponse } from "next/server";

function isValidEmail(value: string): boolean {
  return value.includes("@");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string; name?: string }
    | null;

  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email) || !validatePasswordStrength(body.password)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      email,
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Unable to register account" }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password);

  await prisma.user.create({
    data: {
      email,
      name: body.name?.trim() || email,
      passwordHash,
      role: Role.USER,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
