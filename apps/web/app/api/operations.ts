export const IMPLEMENTED_OPERATION_IDS = [
  "listProjects", "createProject", "getProject", "updateProject", "deleteProject",
  "addProjectOrigin", "deleteProjectOrigin", "resolveProject",
  "listIssues", "createIssue", "getIssue", "updateIssue", "deleteIssue", "listIssueEvents",
  "claimIssue", "claimNextIssue", "heartbeatIssue", "releaseIssue", "completeIssue", "reopenIssue",
  "createAttachment", "downloadAttachment",
  "createAgentPairing", "approveAgentPairing", "exchangeAgentPairingToken",
  "listAgents", "heartbeatAgent", "createAgentRun", "updateAgentRun",
  "listWebhooks", "createWebhook", "updateWebhook", "deleteWebhook", "rotateWebhookSecret", "testWebhook", "listWebhookDeliveries", "retryWebhookDelivery",
  "listApiTokens", "createApiToken", "revokeApiToken",
  "authorizeExtension", "exchangeOAuthToken"
] as const;
