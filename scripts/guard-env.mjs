#!/usr/bin/env node
import { spawn } from "node:child_process";

const appEnv = (process.env.APP_ENV || "local").toLowerCase();
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/guard-env.mjs <command> [...args]");
  process.exit(1);
}

const joined = args.join(" ").toLowerCase();
const isPotentiallyDestructive =
  joined.includes("prisma migrate dev") ||
  joined.includes("prisma migrate reset") ||
  joined.includes("prisma db seed");

if (appEnv === "prod" && isPotentiallyDestructive && process.env.I_UNDERSTAND_PROD !== "1") {
  console.error("Refusing to run destructive Prisma command in APP_ENV=prod without I_UNDERSTAND_PROD=1");
  process.exit(1);
}

const child = spawn(args[0], args.slice(1), {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
