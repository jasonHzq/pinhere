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
    <Link to={`/${locale}/app/issues/${issue.id}`} className="focus-ring group block rounded-lg border border-[#d8d8d2] bg-white p-4 transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-px hover:border-[#151515] hover:shadow-[3px_3px_0_#d8d8d2]">
      <div className="mb-3 flex items-start justify-between gap-3"><Badge variant={issue.status}>{issue.id.slice(-8)}</Badge><ExternalLink size={14} className="text-[#aaa] opacity-0 transition-opacity group-hover:opacity-100" /></div>
      <h3 className="line-clamp-2 text-sm font-bold leading-5 tracking-[-.015em]">{issue.title}</h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#71746e]">{issue.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#e4e4df] pt-3 font-mono text-[9px] text-[#7d7d78]"><span className="flex min-w-0 items-center gap-1.5"><ScanLine size={12} /><span className="truncate">{host}</span></span><span className="flex shrink-0 items-center gap-1"><Clock3 size={11} />{new Date(issue.updatedAt).toLocaleDateString()}</span></div>
    </Link>
  );
}
