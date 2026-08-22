import { useEffect, useMemo, useState } from "react";
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

  async function refresh() {
    setRefreshing(true);
    try {
      const query = projectId === "all" ? "" : `?projectId=${encodeURIComponent(projectId)}`;
      const response = await fetch(`/api/v1/issues${query}`, { headers: etag ? { "If-None-Match": etag } : {} });
      if (response.status !== 304 && response.ok) {
        const body = await response.json() as { data: IssueSummary[] };
        setItems(body.data);
        setEtag(response.headers.get("etag"));
      }
    } finally { setRefreshing(false); }
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
    <main className="min-h-screen p-5 md:p-8 xl:p-10">
      <header className="mb-9 flex flex-col gap-5 border-b border-[#d8d8d2] pb-7 md:flex-row md:items-end md:justify-between">
        <div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#3d3d39]"><CircleDotDashed size={13} />Sync / polling every 5s</div><h1 className="text-4xl font-bold tracking-[-.06em] md:text-5xl">{en ? "Issue board" : "缺陷修复看板"}</h1><p className="mt-2 text-sm text-[#6c6c67]">{en ? "The database is the source of truth for every handoff." : "每一次领取、修复与写回，均以数据库为状态真源。"}</p></div>
        <div className="flex items-center gap-2"><select className="focus-ring h-10 max-w-[230px] rounded-lg border border-[#d0d0ca] bg-white px-3 text-sm font-medium" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="all">{en ? "All projects" : "全部项目"}</option>{initial.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button title={en ? "Refresh" : "刷新"} className="focus-ring grid size-10 place-items-center rounded-lg border border-[#d0d0ca] bg-white transition-colors hover:border-[#151515]" onClick={() => void refresh()}><RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} /></button></div>
      </header>
      {initial.projects.length === 0 ? <div className="border border-dashed border-[#aaa9a2] bg-white/70 p-12 text-center"><h2 className="text-lg font-bold">{en ? "Create a project before capturing an issue" : "先创建项目，再从网页圈选问题"}</h2><a className="mt-4 inline-block text-sm font-bold underline decoration-1 underline-offset-4" href={`/${locale}/app/projects`}>{en ? "Open projects" : "前往项目设置"}</a></div> : (
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const columnItems = filtered.filter((issue) => issue.status === column.status);
            return <section key={column.status} className="min-h-[420px] rounded-xl border border-[#d8d8d2] bg-[#f3f3f0]/85 p-3"><div className="mb-3 flex items-start justify-between border-b border-[#deded8] px-1 pb-3 pt-1"><div><div className="flex items-center gap-2"><h2 className="text-sm font-bold uppercase tracking-[.025em]">{en ? column.en : column.zh}</h2><Badge variant={column.status}>{columnItems.length}</Badge></div><p className="mt-1 font-mono text-[9px] uppercase tracking-[.08em] text-[#7d7d78]">{en ? column.captionEn : column.captionZh}</p></div></div><div className="space-y-2.5">{columnItems.map((issue) => <IssueCard key={issue.id} issue={issue} />)}{!columnItems.length && <div className="grid h-24 place-items-center border border-dashed border-[#cfcec8] bg-white/55 font-mono text-[10px] uppercase tracking-[.12em] text-[#999993]">Empty</div>}</div></section>;
          })}
        </div>
      )}
    </main>
  );
}
