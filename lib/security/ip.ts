type HeaderContainer = Headers | Record<string, string | string[] | undefined>;

function readHeader(headers: HeaderContainer | undefined, key: string): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }
  const value = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function getClientIp(input: { headers?: HeaderContainer } | Request | undefined): string {
  if (!input) return "unknown";
  const headers = input instanceof Request ? input.headers : input.headers;
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = readHeader(headers, "x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
