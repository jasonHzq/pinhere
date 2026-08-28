import { afterEach, describe, expect, it, vi } from "vitest";
import { getCachedWorkspaceRoute, invalidateWorkspaceRouteCache } from "./workspace-route-cache";

afterEach(() => {
  invalidateWorkspaceRouteCache();
  vi.useRealTimers();
});

describe("workspace route cache", () => {
  it("reuses route data and in-flight work for the same URL", async () => {
    const request = new Request("https://pinhere.dev/zh-CN/app/settings");
    const load = vi.fn(async () => ({ tokens: [] }));

    const first = getCachedWorkspaceRoute(request, load);
    const second = getCachedWorkspaceRoute(request, load);

    await expect(first).resolves.toEqual({ tokens: [] });
    await expect(second).resolves.toEqual({ tokens: [] });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("expires entries after thirty seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T00:00:00Z"));
    const request = new Request("https://pinhere.dev/zh-CN/app/projects");
    const load = vi.fn(async () => ({ projects: [] }));

    await getCachedWorkspaceRoute(request, load);
    vi.setSystemTime(new Date("2026-08-25T00:00:31Z"));
    await getCachedWorkspaceRoute(request, load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("invalidates only matching route prefixes", async () => {
    const settings = new Request("https://pinhere.dev/zh-CN/app/settings");
    const projects = new Request("https://pinhere.dev/zh-CN/app/projects");
    const settingsLoad = vi.fn(async () => ({ tokens: [] }));
    const projectsLoad = vi.fn(async () => ({ projects: [] }));

    await getCachedWorkspaceRoute(settings, settingsLoad);
    await getCachedWorkspaceRoute(projects, projectsLoad);
    invalidateWorkspaceRouteCache("/zh-CN/app/settings");
    await getCachedWorkspaceRoute(settings, settingsLoad);
    await getCachedWorkspaceRoute(projects, projectsLoad);

    expect(settingsLoad).toHaveBeenCalledTimes(2);
    expect(projectsLoad).toHaveBeenCalledTimes(1);
  });

  it("shares index-route preloads with regular navigation", async () => {
    const load = vi.fn().mockResolvedValue({ route: "board" });

    await getCachedWorkspaceRoute(new Request("https://pinhere.dev/zh-CN/app?index"), load);
    await getCachedWorkspaceRoute(new Request("https://pinhere.dev/zh-CN/app"), load);

    expect(load).toHaveBeenCalledTimes(1);
  });
});
