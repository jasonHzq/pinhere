import { describe, expect, it } from "vitest";
import { AGENT_ONLINE_WINDOW_MS, agentHealth, claimedAgentSummary } from "./agent-health";

describe("agent health", () => {
  const now = new Date("2026-08-28T08:00:00.000Z").getTime();

  it("marks a recent heartbeat online", () => {
    expect(agentHealth(new Date(now - 30_000), now)).toBe("online");
  });

  it("marks a missing or stale heartbeat offline", () => {
    expect(agentHealth(null, now)).toBe("offline");
    expect(agentHealth(new Date(now - AGENT_ONLINE_WINDOW_MS), now)).toBe("offline");
  });

  it("returns only the public agent fields needed by an issue card", () => {
    expect(claimedAgentSummary({ id: "agt_1", name: "Checkout Agent", lastSeenAt: new Date(now - 10_000) }, now)).toEqual({
      id: "agt_1",
      name: "Checkout Agent",
      health: "online",
      lastSeenAt: new Date(now - 10_000)
    });
  });
});
