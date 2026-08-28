export type IssueIdStatus = "pending" | "generated" | "fallback";

export function visibleIssueIdentifier(issue: { id: string; idStatus: IssueIdStatus }) {
  return issue.idStatus === "pending" ? null : issue.id;
}
