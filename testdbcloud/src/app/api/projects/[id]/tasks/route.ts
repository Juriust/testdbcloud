import { Prisma, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getErrorMessage, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreateTaskInput = {
  title?: string;
  description?: string;
  priority?: number;
  dueDate?: string;
};

function parsePriority(value: unknown): number {
  const priority = Number(value ?? 2);
  if (!Number.isInteger(priority) || priority < 1 || priority > 3) {
    throw new Error("Priority must be an integer between 1 and 3");
  }

  return priority;
}

function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("dueDate must be a valid date string");
  }

  return date;
}

function parseStatusFilter(rawStatus: string | null): TaskStatus | null {
  const normalized = (rawStatus ?? "all").toLowerCase();
  if (normalized === "all") {
    return null;
  }

  if (normalized === "open") {
    return "OPEN";
  }

  if (normalized === "done") {
    return "DONE";
  }

  throw new Error("status must be one of: all, open, done");
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(request.url);

    const status = parseStatusFilter(searchParams.get("status"));
    const q = searchParams.get("q")?.trim();

    const where: Prisma.TaskWhereInput = { projectId };
    if (status) {
      where.status = status;
    }
    if (q) {
      where.title = {
        contains: q,
        mode: "insensitive",
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return jsonError(getErrorMessage(error), 400);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const body = (await request.json()) as CreateTaskInput;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return jsonError("Project not found", 404);
    }

    const title = body.title?.trim();
    if (!title) {
      return jsonError("Task title is required", 400);
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description: body.description?.trim() ? body.description.trim() : null,
        priority: parsePriority(body.priority),
        dueDate: parseDueDate(body.dueDate),
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), 400);
  }
}
