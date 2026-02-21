import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existingTask) {
      return jsonError("Task not found", 404);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: existingTask.status === "OPEN" ? "DONE" : "OPEN",
      },
    });

    return NextResponse.json({ task });
  } catch {
    return jsonError("Failed to toggle task status", 500);
  }
}
