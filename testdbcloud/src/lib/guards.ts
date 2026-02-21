const BLOCKED_MARKERS = ["default_db", "prod", "production"];

export function assertSafeDbReset(env: NodeJS.ProcessEnv = process.env): void {
  const appEnv = (env.APP_ENV ?? "").trim().toLowerCase();
  if (appEnv !== "test") {
    throw new Error(
      `Refusing to run db:reset because APP_ENV must be \"test\". Current APP_ENV: \"${env.APP_ENV ?? "(empty)"}\".`
    );
  }

  const databaseUrl = (env.DATABASE_URL ?? "").trim();
  if (!databaseUrl) {
    throw new Error("Refusing to run db:reset because DATABASE_URL is empty.");
  }

  const loweredUrl = databaseUrl.toLowerCase();
  const blocked = BLOCKED_MARKERS.find((marker) => loweredUrl.includes(marker));
  if (blocked) {
    throw new Error(
      `Refusing to run db:reset because DATABASE_URL contains blocked marker \"${blocked}\". Target a dedicated test database.`
    );
  }
}
