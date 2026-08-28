import { Bot, Clock3, ExternalLink, ScanLine } from "lucide-react";
import { Link, useParams } from "react-router";
import { Badge } from "./ui/badge";
import type { ClaimedAgentSummary } from "~/lib/agent-health";
import { issueDetailPath, visibleIssueIdentifier } from "~/lib/issue-reference";
import { cn } from "~/lib/cn";

export type IssueSummary = {
  id: string;
  idStatus: "pending" | "generated" | "fallback";
  projectId: string;
  title: string;
  description: string;
  pageUrl: string;
  status: "open" | "in_progress" | "done";
  displayStatus?: "open" | "in_progress" | "done" | "failed";
  claimedAgent?: ClaimedAgentSummary | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function IssueCard({ issue }: { issue: IssueSummary }) {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const host = (() => { try { return new URL(issue.pageUrl).host; } catch { return issue.pageUrl; } })();
  const updatedAt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(issue.updatedAt));
  const displayStatus = issue.displayStatus ?? issue.status;
  const visibleIdentifier = visibleIssueIdentifier(issue);
  const statusLabels = en
    ? { open: "Open", in_progress: "In progress", done: "Done", failed: "Failed" }
    : { open: "待处理", in_progress: "处理中", done: "已完成", failed: "处理失败" };
  const statusRail = {
    open: "before:bg-[#9aa4af]",
    in_progress: "before:bg-[#3b82f6]",
    done: "before:bg-[#4f8a68]",
    failed: "before:bg-[#c6535d]"
  }[displayStatus];
  const showClaimedAgent = issue.status === "in_progress" && issue.claimedAgent;
  return (
    <Link to={issueDetailPath(locale, issue.id)} className={cn("focus-ring group relative grid gap-3 overflow-hidden bg-white p-4 transition-colors duration-200 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full hover:bg-[#f7faff] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 sm:py-[1.15rem]", statusRail)}>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant={displayStatus}>{statusLabels[displayStatus]}</Badge>{visibleIdentifier && <span className="max-w-full truncate font-mono text-[9px] uppercase tracking-[.06em] text-[#87919a]">{visibleIdentifier}</span>}</div>
        <h3 className="truncate text-sm font-bold leading-5 tracking-[-.015em] text-[#1d2939] transition-colors group-hover:text-[#1d4ed8] sm:text-[15px]">{issue.title}</h3>
        {issue.description && <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#6f7d90]">{issue.description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-2.5 border-t border-[#e8edf3] pt-3 sm:items-end sm:border-0 sm:pt-0">
        {showClaimedAgent && <div className="flex max-w-full items-center gap-2.5 rounded-xl border border-[#d9e5f2] bg-[#f2f7fd] px-2.5 py-2" aria-label={en ? `Claimed by ${showClaimedAgent.name}, ${showClaimedAgent.health}` : `由 ${showClaimedAgent.name} 认领，${showClaimedAgent.health === "online" ? "心跳正常" : "心跳已停止"}`}>
          <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-[#dcecff] text-[#2563eb]"><Bot size={15} aria-hidden="true" /><span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white", showClaimedAgent.health === "online" ? "bg-[#22a06b]" : "bg-[#aab4c0]")} /></span>
          <span className="min-w-0">
            <span className="block max-w-48 truncate text-xs font-bold leading-4 text-[#24364d]">{showClaimedAgent.name}</span>
            <span className={cn("mt-0.5 flex items-center gap-1.5 font-mono text-[8px] font-medium uppercase tracking-[.07em]", showClaimedAgent.health === "online" ? "text-[#19734d]" : "text-[#778391]")}><span className={cn("size-1.5 rounded-full", showClaimedAgent.health === "online" ? "bg-[#22a06b]" : "bg-[#aab4c0]")} />{showClaimedAgent.health === "online" ? (en ? "Healthy" : "心跳正常") : (en ? "Offline" : "心跳已停止")}</span>
          </span>
        </div>}
        <div className="flex w-full items-center gap-4 font-mono text-[9px] text-[#7b8798] sm:w-auto">
          <span className="flex min-w-0 items-center gap-1.5"><ScanLine size={12} /><span className="max-w-32 truncate">{host}</span></span>
          <span className="flex shrink-0 items-center gap-1"><Clock3 size={11} />{updatedAt}</span>
          <ExternalLink size={14} className="ml-auto shrink-0 text-[#8090a6] opacity-45 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}
