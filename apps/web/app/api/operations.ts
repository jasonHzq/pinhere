export const IMPLEMENTED_OPERATION_IDS = [
  "listProjects", "createProject", "getProject", "updateProject", "deleteProject",
  "addProjectOrigin", "deleteProjectOrigin", "resolveProject",
  "listIssues", "createIssue", "getIssue", "updateIssue", "deleteIssue", "listIssueEvents",
  "claimIssue", "claimNextIssue", "releaseIssue", "completeIssue", "reopenIssue",
  "createAttachment", "downloadAttachment",
  "listWebhooks", "createWebhook", "updateWebhook", "deleteWebhook", "rotateWebhookSecret", "testWebhook", "listWebhookDeliveries", "retryWebhookDelivery",
  "listApiTokens", "createApiToken", "revokeApiToken",
  "authorizeExtension", "exchangeOAuthToken"
] as const;
