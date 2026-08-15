const sensitive = /(^|[_-])(token|code|key|secret|session|auth|jwt|password)($|[_-])/i;
export function sanitizeUrl(value: string) { const url = new URL(value); for (const [key] of url.searchParams) if (sensitive.test(key)) url.searchParams.set(key, "[redacted]"); const hashKey = url.hash.slice(1).split("=")[0] ?? ""; if (sensitive.test(hashKey)) url.hash = "#[redacted]"; return url.toString(); }
