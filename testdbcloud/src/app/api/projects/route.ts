import { NextResponse } from "next/server";
import { getErrorMessage, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type CreateProjectInput = {
  name?: string;
};

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects failed:", error);
    return jsonError(getErrorMessage(error), 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProjectInput;
    const name = body.name?.trim();

    if (!name || name.length < 1) {
      return jsonError("Project name is required", 400);
    }

    const project = await prisma.project.create({
      data: { name },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects failed:", error);
    return jsonError(getErrorMessage(error), 500);
  }
}
