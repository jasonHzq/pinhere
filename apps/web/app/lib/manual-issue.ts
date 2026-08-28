import type { DomContext } from "~/db/schema";

export function manualIssueDescription(en: boolean) {
  return en
    ? `## What happened\n\n\n## Expected result\n\n\n## Steps to reproduce\n1. Open the page\n2. \n\n## Additional context\n`
    : `## 问题是什么\n\n\n## 修复预期\n\n\n## 复现方式\n1. 打开页面\n2. \n\n## 补充说明\n`;
}

export function manualIssueDom(): DomContext {
  return {
    cssSelector: "",
    xpath: "",
    tagName: "manual-report",
    attributes: {},
    text: "",
    outerHTML: "",
    viewport: { width: 1, height: 1, devicePixelRatio: 1 },
    boundingRect: { x: 0, y: 0, width: 0, height: 0 }
  };
}

export function pageBelongsToProject(pageUrl: string, origins: string[]) {
  try {
    return origins.includes(new URL(pageUrl.trim()).origin.toLowerCase());
  } catch {
    return false;
  }
}

export function manualIssuePayload(input: {
  projectId: string;
  title: string;
  description: string;
  pageUrl: string;
}) {
  return {
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    pageUrl: input.pageUrl.trim(),
    dom: manualIssueDom(),
    source: "web" as const
  };
}
