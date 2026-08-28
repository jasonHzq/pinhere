import { describe, expect, it, vi } from "vitest";
import { patchWithVersionRetry } from "./optimistic-update";

describe("patchWithVersionRetry", () => {
  it("refreshes the version before the first patch", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { id: "issue-1", version: 4 } }))
      .mockResolvedValueOnce(Response.json({ data: { id: "issue-1", version: 5 } }));

    const result = await patchWithVersionRetry<{ id: string; version: number }>({
      path: "/api/v1/issues/issue-1",
      version: 3,
      body: { title: "Updated" },
      fetcher,
      createIdempotencyKey: () => "fresh-version-key"
    });

    expect(result.response.ok).toBe(true);
    expect(result.latest).toEqual({ id: "issue-1", version: 4 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[1]).toEqual({ cache: "no-store", headers: { "cache-control": "no-cache" } });
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ "X-Pinhere-If-Match": '"4"', "Idempotency-Key": "fresh-version-key" });
  });

  it("refreshes and retries when the resource changes again during the save", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { id: "issue-1", version: 4 } }))
      .mockResolvedValueOnce(Response.json({ error: { code: "version_conflict" } }, { status: 412 }))
      .mockResolvedValueOnce(Response.json({ data: { id: "issue-1", version: 5 } }))
      .mockResolvedValueOnce(Response.json({ data: { id: "issue-1", version: 6 } }));
    const keys = ["first-patch-key", "retry-patch-key"];

    const result = await patchWithVersionRetry<{ id: string; version: number }>({
      path: "/api/v1/issues/issue-1",
      version: 3,
      body: { title: "Updated" },
      fetcher,
      createIdempotencyKey: () => keys.shift()!
    });

    expect(result.response.ok).toBe(true);
    expect(result.latest).toEqual({ id: "issue-1", version: 5 });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ "X-Pinhere-If-Match": '"4"', "Idempotency-Key": "first-patch-key" });
    expect(fetcher.mock.calls[3]?.[1]?.headers).toMatchObject({ "X-Pinhere-If-Match": '"5"', "Idempotency-Key": "retry-patch-key" });
  });

  it("falls back to the page version when the preflight refresh fails", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { code: "temporarily_unavailable" } }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: { id: "issue-1", version: 4 } }));

    const result = await patchWithVersionRetry({
      path: "/api/v1/issues/issue-1",
      version: 3,
      body: { title: "Updated" },
      fetcher,
      createIdempotencyKey: () => "fallback-version-key"
    });

    expect(result.response.ok).toBe(true);
    expect(result.latest).toBeNull();
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ "X-Pinhere-If-Match": '"3"' });
  });
});
