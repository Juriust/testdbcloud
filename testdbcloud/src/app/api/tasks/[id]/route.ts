import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getErrorMessage, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("Task not found", 404);
    }

    return jsonError(getErrorMessage(error), 500);
  }
}
