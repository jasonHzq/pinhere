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
  const updatedAt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(issue.updatedAt));
  return (
    <Link to={`/${locale}/app/issues/${issue.id}`} className="focus-ring group block rounded-2xl border border-[#d8dee4] bg-white p-4 shadow-[0_5px_18px_rgba(35,45,54,.04)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#95a5b1] hover:shadow-[0_12px_28px_rgba(35,45,54,.1)]">
      <div className="mb-3 flex items-start justify-between gap-3"><Badge variant={issue.status}>{issue.id.slice(-8)}</Badge><ExternalLink size={14} className="text-[#9b9c93] opacity-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></div>
      <h3 className="line-clamp-2 text-sm font-bold leading-5 tracking-[-.015em] text-[#20252a]">{issue.title}</h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#707a83]">{issue.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#e2e7eb] pt-3 font-mono text-[9px] text-[#7c8790]"><span className="flex min-w-0 items-center gap-1.5"><ScanLine size={12} /><span className="truncate">{host}</span></span><span className="flex shrink-0 items-center gap-1"><Clock3 size={11} />{updatedAt}</span></div>
    </Link>
  );
}
