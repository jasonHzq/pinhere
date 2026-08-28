type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type VersionedResource = {
  version: number;
};

type PatchWithVersionRetryOptions = {
  path: string;
  version: number;
  body: Record<string, unknown>;
  fetcher?: Fetcher;
  createIdempotencyKey?: () => string;
};

const MAX_PATCH_ATTEMPTS = 3;

export async function patchWithVersionRetry<T extends VersionedResource>({
  path,
  version,
  body,
  fetcher = fetch,
  createIdempotencyKey = () => crypto.randomUUID()
}: PatchWithVersionRetryOptions): Promise<{ response: Response; latest: T | null }> {
  const patch = (targetVersion: number) => fetcher(path, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "X-Pinhere-If-Match": `"${targetVersion}"`,
      "Idempotency-Key": createIdempotencyKey()
    },
    body: JSON.stringify(body)
  });

  const refresh = async () => {
    const response = await fetcher(path, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" }
    });
    if (!response.ok) return null;
    try {
      const payload = await response.json() as { data?: T };
      return payload.data && typeof payload.data.version === "number" ? payload.data : null;
    } catch {
      return null;
    }
  };

  // Claims, heartbeats, and other state transitions also increment an issue's
  // version. Refresh immediately before saving so a page left open while an
  // agent starts work does not submit an already-stale If-Match value.
  let latest = await refresh();
  let targetVersion = latest?.version ?? version;
  let response = await patch(targetVersion);

  for (let attempt = 1; response.status === 412 && attempt < MAX_PATCH_ATTEMPTS; attempt += 1) {
    latest = await refresh();
    if (!latest) break;
    targetVersion = latest.version;
    response = await patch(targetVersion);
  }

  return { response, latest };
}
