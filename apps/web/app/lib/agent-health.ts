export const AGENT_ONLINE_WINDOW_MS = 90_000;

export type ClaimedAgentSummary = {
  id: string;
  name: string;
  health: "online" | "offline";
  lastSeenAt: Date | string | null;
};

export function agentHealth(lastSeenAt: Date | string | null, capturedAt = Date.now()): ClaimedAgentSummary["health"] {
  if (!lastSeenAt) return "offline";
  const lastSeen = new Date(lastSeenAt).getTime();
  return Number.isFinite(lastSeen) && capturedAt - lastSeen < AGENT_ONLINE_WINDOW_MS ? "online" : "offline";
}

export function claimedAgentSummary(
  agent: { id: string; name: string; lastSeenAt: Date | string | null },
  capturedAt = Date.now()
): ClaimedAgentSummary {
  return {
    id: agent.id,
    name: agent.name,
    health: agentHealth(agent.lastSeenAt, capturedAt),
    lastSeenAt: agent.lastSeenAt
  };
}
