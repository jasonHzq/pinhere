import { Clock3, ExternalLink, ScanLine } from "lucide-react";
import { Link, useParams } from "react-router";
import { Badge } from "./ui/badge";

export type IssueSummary = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  pageUrl: string;
  status: "open" | "in_progress" | "done";
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function IssueCard({ issue }: { issue: IssueSummary }) {
  const { locale = "zh-CN" } = useParams();
  const host = (() => { try { return new URL(issue.pageUrl).host; } catch { return issue.pageUrl; } })();
  return (
    <Link to={`/${locale}/app/issues/${issue.id}`} className="focus-ring group block rounded-[13px] border border-[#d3d2cb] bg-[#faf9f5] p-4 shadow-[0_5px_18px_rgba(30,32,28,.04)] transition-all hover:-translate-y-0.5 hover:border-[#aaa9a2] hover:shadow-[0_9px_24px_rgba(30,32,28,.08)]">
      <div className="mb-3 flex items-start justify-between gap-3"><Badge variant={issue.status}>{issue.id.slice(-8)}</Badge><ExternalLink size={14} className="text-[#aaa] opacity-0 transition-opacity group-hover:opacity-100" /></div>
      <h3 className="line-clamp-2 text-sm font-bold leading-5 tracking-[-.015em]">{issue.title}</h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#71746e]">{issue.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#e4e3dd] pt-3 font-mono text-[9px] text-[#8b8e87]"><span className="flex min-w-0 items-center gap-1.5"><ScanLine size={12} /><span className="truncate">{host}</span></span><span className="flex shrink-0 items-center gap-1"><Clock3 size={11} />{new Date(issue.updatedAt).toLocaleDateString()}</span></div>
    </Link>
  );
}
