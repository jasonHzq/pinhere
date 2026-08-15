const SENSITIVE_QUERY = /(^|[_-])(token|code|key|secret|session|auth|jwt|password)($|[_-])/i;

export function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS origins are supported");
  }
  return url.origin.toLowerCase();
}

export function sanitizePageUrl(value: string): string {
  const url = new URL(value);
  for (const [key] of url.searchParams) {
    if (SENSITIVE_QUERY.test(key)) url.searchParams.set(key, "[redacted]");
  }
  if (url.hash && SENSITIVE_QUERY.test(url.hash.slice(1).split("=")[0] ?? "")) {
    url.hash = "#[redacted]";
  }
  return url.toString();
}
