"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("You must be logged in to create a post");
  }

  const activeUser = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!activeUser) {
    throw new Error("Your account is deactivated");
  }

  await prisma.post.create({
    data: {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      authorId: activeUser.id,
    },
  });

  redirect("/posts");
} 
