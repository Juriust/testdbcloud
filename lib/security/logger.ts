const SENSITIVE_FIELD_PATTERNS = [
  /email/i,
  /phone/i,
  /full.?name/i,
  /address/i,
  /passport/i,
  /code/i,
  /password/i,
  /hash/i,
  /token/i,
  /secret/i,
];

type Primitive = string | number | boolean | null;
type SafeValue = Primitive | SafeValue[] | { [key: string]: SafeValue };

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown): SafeValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }
  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, SafeValue> = {};
    for (const [key, innerValue] of Object.entries(input)) {
      output[key] = shouldRedactKey(key) ? "[REDACTED]" : sanitizeValue(innerValue);
    }
    return output;
  }
  return String(value);
}

function print(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const safeContext = context ? sanitizeValue(context) : undefined;
  const payload = safeContext ? { message, context: safeContext } : { message };
  const line = JSON.stringify(payload);

  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => print("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => print("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => print("error", message, context),
};
