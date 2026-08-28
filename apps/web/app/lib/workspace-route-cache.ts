const workspaceRouteCacheTtlMs = 30_000;
const maxWorkspaceRouteEntries = 12;

type WorkspaceRouteCacheEntry = {
  expiresAt: number;
  value: Promise<unknown>;
};

const workspaceRouteCache = new Map<string, WorkspaceRouteCacheEntry>();

function workspaceRouteCacheKey(request: Request) {
  const url = new URL(request.url);
  // Fetchers use `?index` to target an index route; regular navigation reaches
  // the same route without that internal marker, so both share one cache entry.
  url.searchParams.delete("index");
  return `${url.pathname}${url.search}`;
}

function trimWorkspaceRouteCache(now: number) {
  for (const [key, entry] of workspaceRouteCache) {
    if (entry.expiresAt <= now) workspaceRouteCache.delete(key);
  }
  while (workspaceRouteCache.size >= maxWorkspaceRouteEntries) {
    const oldest = workspaceRouteCache.keys().next().value;
    if (typeof oldest !== "string") break;
    workspaceRouteCache.delete(oldest);
  }
}

export function getCachedWorkspaceRoute<T>(request: Request, load: () => Promise<T>): Promise<T> {
  const key = workspaceRouteCacheKey(request);
  const now = Date.now();
  const cached = workspaceRouteCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value as Promise<T>;

  trimWorkspaceRouteCache(now);
  const value = load().catch((error) => {
    workspaceRouteCache.delete(key);
    throw error;
  });
  workspaceRouteCache.set(key, { expiresAt: now + workspaceRouteCacheTtlMs, value });
  return value;
}

export function invalidateWorkspaceRouteCache(pathPrefix?: string) {
  if (!pathPrefix) {
    workspaceRouteCache.clear();
    return;
  }
  for (const key of workspaceRouteCache.keys()) {
    if (key.startsWith(pathPrefix)) workspaceRouteCache.delete(key);
  }
}
