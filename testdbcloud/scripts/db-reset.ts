import { spawnSync } from "node:child_process";
import { assertSafeDbReset } from "../src/lib/guards";

function runOrThrow(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function main() {
  assertSafeDbReset();

  runOrThrow("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"]);
  runOrThrow("npm", ["run", "db:migrate"]);
  runOrThrow("npm", ["run", "db:seed"]);

  console.log("db:reset finished successfully.");
}

try {
  main();
} catch (error) {
  console.error("db:reset failed:", error);
  process.exit(1);
}
