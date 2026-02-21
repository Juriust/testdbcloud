import "dotenv/config";
import { defineConfig } from "prisma/config";

const fallbackLocalDatabaseUrl = "postgresql://postgres:postgres@localhost:54322/postgres";
const databaseUrl = process.env.DATABASE_URL ?? fallbackLocalDatabaseUrl;

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx ./prisma/seed.ts",
    },
    datasource: {
        url: databaseUrl,
    },
});
