import { PrismaClient, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

function assertPriority(priority: number): number {
  if (!Number.isInteger(priority) || priority < 1 || priority > 3) {
    throw new Error(`Invalid priority \"${priority}\". Expected a value between 1 and 3.`);
  }

  return priority;
}

async function main() {
  const inbox = await prisma.project.upsert({
    where: { id: "00000000-0000-0000-0000-000000000000" },
    update: { name: "Inbox" },
    create: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Inbox",
    },
  });

  await prisma.task.deleteMany({ where: { projectId: inbox.id } });

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const seedTasks: Array<{
    title: string;
    description?: string;
    status: TaskStatus;
    priority: number;
    dueDate?: Date;
  }> = [
    {
      title: "Setup cloud DB connection",
      description: "Validate sslmode=require and credentials",
      status: "OPEN",
      priority: 1,
      dueDate: new Date(now + day),
    },
    {
      title: "Create API routes for projects",
      status: "DONE",
      priority: 2,
    },
    {
      title: "Implement task filters",
      status: "OPEN",
      priority: 2,
      dueDate: new Date(now + 2 * day),
    },
    {
      title: "Write db:check health script",
      status: "DONE",
      priority: 1,
    },
    {
      title: "Add guard for db:reset",
      status: "OPEN",
      priority: 1,
    },
    {
      title: "Polish /projects UI",
      status: "OPEN",
      priority: 3,
      dueDate: new Date(now + 4 * day),
    },
    {
      title: "Test CRUD latency",
      status: "DONE",
      priority: 2,
    },
    {
      title: "Add due date display",
      status: "OPEN",
      priority: 3,
    },
    {
      title: "Verify cascade delete",
      status: "DONE",
      priority: 1,
    },
    {
      title: "Document local setup",
      status: "OPEN",
      priority: 2,
      dueDate: new Date(now + 3 * day),
    },
  ];

  await prisma.task.createMany({
    data: seedTasks.map((task) => ({
      projectId: inbox.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: assertPriority(task.priority),
      dueDate: task.dueDate,
    })),
  });

  console.log(`Seed complete: project \"${inbox.name}\" with ${seedTasks.length} tasks.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
