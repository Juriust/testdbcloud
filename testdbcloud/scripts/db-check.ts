import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";

const prisma = new PrismaClient();

type TimingResult<T> = {
  value: T;
  ms: number;
};

async function measure<T>(label: string, action: () => Promise<T>): Promise<TimingResult<T>> {
  const started = performance.now();
  const value = await action();
  const ms = performance.now() - started;
  console.log(`${label}: ${ms.toFixed(2)} ms`);
  return { value, ms };
}

async function main() {
  const totalStarted = performance.now();

  await measure("SELECT 1", async () => {
    return prisma.$queryRaw`SELECT 1`;
  });

  const tablesResult = await measure("Check required tables", async () => {
    return prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('Project', 'Task', '_prisma_migrations')
    `;
  });

  const tableNames = new Set(tablesResult.value.map((row) => row.table_name));
  const requiredTables = ["Project", "Task", "_prisma_migrations"];
  const missingTables = requiredTables.filter((tableName) => !tableNames.has(tableName));
  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
  }

  const migrationsResult = await measure("Check applied migrations", async () => {
    return prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "_prisma_migrations"
    `;
  });

  const rawCount = migrationsResult.value[0]?.count;
  const migrationCount =
    typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount ?? 0);
  if (migrationCount <= 0) {
    throw new Error("No applied migrations found in _prisma_migrations.");
  }

  const tempProject = await measure("Create temp project", async () => {
    return prisma.project.create({
      data: {
        name: `db-check-${Date.now()}`,
      },
    });
  });

  const tempTask = await measure("Create temp task", async () => {
    return prisma.task.create({
      data: {
        projectId: tempProject.value.id,
        title: "db-check task",
        priority: 2,
      },
    });
  });

  await measure("Read temp task", async () => {
    const found = await prisma.task.findUnique({ where: { id: tempTask.value.id } });
    if (!found) {
      throw new Error("Failed to read temp task after insert.");
    }

    return found;
  });

  await measure("Delete temp task", async () => {
    return prisma.task.delete({ where: { id: tempTask.value.id } });
  });

  await measure("Delete temp project", async () => {
    return prisma.project.delete({ where: { id: tempProject.value.id } });
  });

  const totalMs = performance.now() - totalStarted;
  console.log(`db:check OK. Total latency: ${totalMs.toFixed(2)} ms`);
}

main()
  .catch((error) => {
    console.error("db:check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
