import { useEffect, useMemo, useRef, useState } from "react";
import { CircleDotDashed, RefreshCcw } from "lucide-react";
import { useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/board";
import { IssueCard, type IssueSummary } from "~/components/issue-card";
import { Badge } from "~/components/ui/badge";
import { getDatabase } from "~/db/client.server";
import { issues, projects } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import { getPrincipal } from "~/lib/principal.server";

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [projectRows, issueRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, principal.userId)).orderBy(desc(projects.updatedAt)),
    db.select().from(issues).where(eq(issues.userId, principal.userId)).orderBy(desc(issues.createdAt)).limit(100)
  ]);
  return { projects: projectRows, issues: issueRows };
}

const columns = [
  { status: "open" as const, zh: "待处理", en: "Open", captionZh: "等待 Agent 领取", captionEn: "Waiting for an agent" },
  { status: "in_progress" as const, zh: "处理中", en: "In progress", captionZh: "认领永久有效", captionEn: "Claims do not expire" },
  { status: "done" as const, zh: "已完成", en: "Done", captionZh: "修复结果已写回", captionEn: "Resolution reported" }
];

export default function Board() {
  const initial = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const [items, setItems] = useState<IssueSummary[]>(initial.issues as IssueSummary[]);
  const [projectId, setProjectId] = useState("all");
  const [etag, setEtag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const refreshInFlight = useRef(false);

  async function refresh() {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      const query = projectId === "all" ? "" : `?projectId=${encodeURIComponent(projectId)}`;
      const response = await fetch(`/api/v1/issues${query}`, { headers: etag ? { "If-None-Match": etag } : {} });
      if (response.status !== 304 && response.ok) {
        const body = await response.json() as { data: IssueSummary[] };
        setItems(body.data);
        setEtag(response.headers.get("etag"));
      }
      if (!response.ok && response.status !== 304) throw new Error("refresh_failed");
      setRefreshError("");
    } catch {
      setRefreshError(en ? "Could not refresh the board. Check your connection and try again." : "看板刷新失败，请检查网络后重试。");
    } finally { refreshInFlight.current = false; setRefreshing(false); }
  }

  useEffect(() => {
    void refresh();
    const tick = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(tick, 5_000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
  }, [projectId]);

  const filtered = useMemo(() => projectId === "all" ? items : items.filter((item) => item.projectId === projectId), [items, projectId]);
  return (
    <main className="page-shell min-h-screen">
      <header className="page-header flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div><div className="page-kicker"><span className="pulse-pin size-1.5 rounded-full bg-[#2563eb]" /><CircleDotDashed size={13} />Sync / polling every 5s</div><h1 className="page-title">{en ? "Issue board" : "缺陷修复看板"}</h1><p className="page-description">{en ? "Every report stays visible from first capture to final resolution." : "从第一次圈选到最终修复，每一条反馈都清晰可见。"}</p></div>
        <div className="flex items-center gap-2"><label className="sr-only" htmlFor="project-filter">{en ? "Filter by project" : "按项目筛选"}</label><select id="project-filter" className="focus-ring h-11 min-w-0 max-w-[240px] rounded-xl border border-[#cbd3da] bg-white px-3 text-base font-medium shadow-[0_3px_12px_rgba(35,45,54,.04)] sm:text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="all">{en ? "All projects" : "全部项目"}</option>{initial.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button title={en ? "Refresh" : "刷新"} aria-label={en ? "Refresh" : "刷新"} disabled={refreshing} className="focus-ring icon-button border border-[#cbd3da] bg-white text-[#5f707c] shadow-[0_3px_12px_rgba(35,45,54,.04)] transition-colors hover:border-[#8395a1] hover:bg-[#f8fafb] disabled:opacity-45" onClick={() => void refresh()}><RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} /></button></div>
      </header>
      {refreshError && <p role="alert" className="mb-5 rounded-xl border border-[#e2bfc0] bg-[#f8eaea] px-4 py-3 text-xs text-[#963a3a]">{refreshError}</p>}
      {initial.projects.length === 0 ? <div className="soft-empty p-10 text-center sm:p-14"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]"><CircleDotDashed size={21} /></span><h2 className="text-lg font-bold">{en ? "Create a project before capturing an issue" : "先创建项目，再从网页圈选问题"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6">{en ? "Projects connect captured pages to the right workspace." : "项目会把你圈选的网页自动送到正确的工作台。"}</p><a className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white" href={`/${locale}/app/projects`}>{en ? "Open projects" : "前往项目设置"}</a></div> : (
        <div className="grid gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const columnItems = filtered.filter((issue) => issue.status === column.status);
            const tone = column.status === "open" ? "bg-[#f1f3f5]" : column.status === "in_progress" ? "bg-[#edf3f6]" : "bg-[#edf3f3]";
            const dot = column.status === "open" ? "bg-[#7a858f]" : column.status === "in_progress" ? "bg-[#58748a]" : "bg-[#4f7478]";
            return <section key={column.status} className={`rounded-2xl border border-[#d8dee4] p-3.5 xl:min-h-[360px] ${tone}`}><div className="mb-3 flex items-start justify-between border-b border-[#d7dde2] px-1 pb-3 pt-1"><div><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${dot}`} /><h2 className="text-sm font-bold tracking-[-.01em]">{en ? column.en : column.zh}</h2><Badge variant={column.status}>{columnItems.length}</Badge></div><p className="mt-1.5 font-mono text-[9px] uppercase tracking-[.07em] text-[#75808a]">{en ? column.captionEn : column.captionZh}</p></div></div><div className="space-y-2.5">{columnItems.map((issue) => <IssueCard key={issue.id} issue={issue} />)}{!columnItems.length && <div className="grid h-24 place-items-center rounded-xl border border-dashed border-[#cbd3da] bg-white/50 font-mono text-[10px] uppercase tracking-[.1em] text-[#8b959e]">{en ? "All clear" : "暂无缺陷"}</div>}</div></section>;
          })}
        </div>
      )}
    </main>
  );
}
