export type AppEnv = "local" | "staging" | "prod";

export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV?.toLowerCase();
  if (value === "staging" || value === "prod") {
    return value;
  }
  return "local";
}

export function isProdAppEnv(): boolean {
  return getAppEnv() === "prod";
}

export function isLocalAppEnv(): boolean {
  return getAppEnv() === "local";
}
