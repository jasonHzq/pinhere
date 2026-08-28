export function issueApiPath(identifier: string, suffix = "") {
  return `/api/v1/issues/${encodeURIComponent(identifier)}${suffix}`;
}

export function issueDetailPath(locale: string, identifier: string) {
  return `/${locale}/app/issues/${encodeURIComponent(identifier)}`;
}

export function visibleIssueIdentifier(issue: { id: string; idStatus: "pending" | "generated" | "fallback" }) {
  return issue.idStatus === "pending" ? null : issue.id;
}
