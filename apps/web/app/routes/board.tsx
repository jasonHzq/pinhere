import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleDotDashed, ListFilter, Plus, RefreshCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Await, useLoaderData, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/board";
import { IssueCard, type IssueSummary } from "~/components/issue-card";
import { Button } from "~/components/ui/button";
import { Dialog } from "~/components/ui/dialog";
import { Input, Textarea } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/motion/tabs";
import { getDatabase } from "~/db/client.server";
import { agentInstances, agentRuns, issues, projectOrigins, projects } from "~/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { claimedAgentSummary } from "~/lib/agent-health";
import { getPrincipal } from "~/lib/principal.server";
import { publicIssue } from "~/lib/issue-readable-id.server";
import { workspaceLoaderCache } from "~/lib/http-cache";
import { issueDetailPath } from "~/lib/issue-reference";
import { manualIssueDescription, manualIssuePayload, pageBelongsToProject } from "~/lib/manual-issue";
import { getCachedWorkspaceRoute, invalidateWorkspaceRouteCache } from "~/lib/workspace-route-cache";

export function headers() {
  return workspaceLoaderCache;
}

async function loadBoard(userId: string) {
  const db = getDatabase();
  const [projectRows, originRows, issueRows, runRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt)),
    db.select().from(projectOrigins).where(eq(projectOrigins.userId, userId)),
    db.select({
      issue: {
        id: issues.id,
        readableId: issues.readableId,
        readableIdStatus: issues.readableIdStatus,
        projectId: issues.projectId,
        title: issues.title,
        description: issues.description,
        pageUrl: issues.pageUrl,
        status: issues.status,
        claimedByTokenId: issues.claimedByTokenId,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt
      },
      claimedAgent: { id: agentInstances.id, name: agentInstances.name, lastSeenAt: agentInstances.lastSeenAt }
    }).from(issues).leftJoin(agentInstances, and(eq(issues.claimedByTokenId, agentInstances.tokenId), eq(agentInstances.userId, userId))).where(eq(issues.userId, userId)).orderBy(desc(issues.createdAt)).limit(100),
    db.select({ issueId: agentRuns.issueId, status: agentRuns.status, createdAt: agentRuns.createdAt }).from(agentRuns).where(eq(agentRuns.userId, userId)).orderBy(desc(agentRuns.createdAt)).limit(500)
  ]);
  const capturedAt = Date.now();
  const latestRunStatus = new Map<string, string>();
  for (const run of runRows) if (!latestRunStatus.has(run.issueId)) latestRunStatus.set(run.issueId, run.status);
  const originsByProject = new Map<string, string[]>();
  for (const origin of originRows) {
    const entries = originsByProject.get(origin.projectId) ?? [];
    entries.push(origin.origin);
    originsByProject.set(origin.projectId, entries);
  }
  return {
    projects: projectRows.map((project) => ({
      ...project,
      origins: originsByProject.get(project.id) ?? []
    })),
    issues: issueRows.map((row) => ({
      ...publicIssue(row.issue),
      displayStatus: latestRunStatus.get(row.issue.id) === "failed" ? "failed" as const : row.issue.status,
      claimedAgent: row.claimedAgent ? claimedAgentSummary(row.claimedAgent, capturedAt) : null
    }))
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  // Return the authenticated shell immediately; React Router streams the
  // database-backed board into the existing document as soon as it resolves.
  return { board: loadBoard(principal.userId) };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  return getCachedWorkspaceRoute(request, serverLoader);
}
clientLoader.hydrate = true as const;

const filters = [
  { status: "open" as const, zh: "待处理", en: "Open", dot: "bg-[#7b8794]" },
  { status: "in_progress" as const, zh: "处理中", en: "In progress", dot: "bg-[#3b82f6]" },
  { status: "done" as const, zh: "已完成", en: "Done", dot: "bg-[#4f8a68]" },
  { status: "failed" as const, zh: "处理失败", en: "Failed", dot: "bg-[#c6535d]" }
];

type DisplayStatus = typeof filters[number]["status"];

function BoardLoading({ en }: { en: boolean }) {
  return (
    <main className="page-shell min-h-screen" aria-busy="true" aria-label={en ? "Loading issue board" : "正在加载缺陷看板"}>
      <header className="page-header">
        <div className="h-3 w-36 animate-pulse rounded-full bg-[#dbe5f1]" />
        <div className="mt-4 h-11 w-52 max-w-full animate-pulse rounded-xl bg-[#dbe5f1]" />
        <div className="mt-3 h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-[#e4ebf3]" />
      </header>
      <section className="mb-4 h-32 animate-pulse rounded-[1.35rem] border border-[#d5dee9] bg-white/80" />
      <section className="min-h-64 animate-pulse rounded-[1.35rem] border border-[#d5dee9] bg-white/80" />
      <span className="sr-only" role="status">{en ? "Loading workspace data…" : "正在加载工作台数据…"}</span>
    </main>
  );
}

function BoardLoadError({ en }: { en: boolean }) {
  return <main className="page-shell min-h-screen"><p role="alert" className="rounded-xl border border-[#e2bfc0] bg-[#f8eaea] px-4 py-3 text-sm text-[#963a3a]">{en ? "The issue board could not be loaded. Refresh to try again." : "缺陷看板加载失败，请刷新后重试。"}</p></main>;
}

export default function Board() {
  const { board } = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  return (
    <Suspense fallback={<BoardLoading en={en} />}>
      <Await resolve={board} errorElement={<BoardLoadError en={en} />}>
        {(initial) => <BoardContent initial={initial} />}
      </Await>
    </Suspense>
  );
}

function BoardContent({ initial }: { initial: Awaited<ReturnType<typeof loadBoard>> }) {
  const { locale = "zh-CN" } = useParams();
  const navigate = useNavigate();
  const en = locale === "en";
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<IssueSummary[]>(initial.issues as IssueSummary[]);
  const [projectId, setProjectId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DisplayStatus>("all");
  const [etag, setEtag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [manualProjectId, setManualProjectId] = useState(initial.projects[0]?.id ?? "");
  const [manualPageUrl, setManualPageUrl] = useState(initial.projects[0]?.origins[0] ?? "");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState(manualIssueDescription(en));
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const refreshInFlight = useRef(false);

  const selectedManualProject = initial.projects.find((project) => project.id === manualProjectId) ?? null;

  function openManualCreate() {
    const preferred = initial.projects.find((project) => project.id === projectId) ?? initial.projects[0];
    setManualProjectId(preferred?.id ?? "");
    setManualPageUrl(preferred?.origins[0] ?? "");
    setManualTitle("");
    setManualDescription(manualIssueDescription(en));
    setCreateError("");
    setShowCreate(true);
  }

  async function createManualIssue(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedManualProject) return;
    if (!pageBelongsToProject(manualPageUrl, selectedManualProject.origins)) {
      setCreateError(en ? "Enter a page URL from one of the sites connected to this project." : "请输入该项目已连接站点下的页面网址。");
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      const response = await fetch("/api/v1/issues", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(manualIssuePayload({ projectId: manualProjectId, title: manualTitle, description: manualDescription, pageUrl: manualPageUrl }))
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? (en ? "Issue creation failed." : "缺陷创建失败，请重试。"));
      invalidateWorkspaceRouteCache();
      setShowCreate(false);
      navigate(issueDetailPath(locale, body.data.id));
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : (en ? "Network error. Try again." : "网络异常，请重试。"));
    } finally {
      setCreateBusy(false);
    }
  }

  async function refresh() {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/v1/issues?limit=100", { headers: etag ? { "If-None-Match": etag } : {} });
      if (response.status !== 304 && response.ok) {
        invalidateWorkspaceRouteCache();
        const body = await response.json() as { data: IssueSummary[] };
        setItems((current) => body.data.map((issue) => ({
          ...issue,
          displayStatus: current.find((item) => item.id === issue.id)?.displayStatus ?? issue.status,
          claimedAgent: issue.claimedAgent ?? current.find((item) => item.id === issue.id)?.claimedAgent ?? null
        })));
        setEtag(response.headers.get("etag"));
      }
      if (!response.ok && response.status !== 304) throw new Error("refresh_failed");
      setRefreshError("");
    } catch {
      setRefreshError(en ? "Could not refresh the issue list. Check your connection and try again." : "缺陷列表刷新失败，请检查网络后重试。");
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(tick, 15_000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [etag]);

  const projectItems = useMemo(() => projectId === "all" ? items : items.filter((item) => item.projectId === projectId), [items, projectId]);
  const counts = useMemo(() => Object.fromEntries(filters.map((filter) => [filter.status, projectItems.filter((issue) => (issue.displayStatus ?? issue.status) === filter.status).length])) as Record<DisplayStatus, number>, [projectItems]);
  const filtered = useMemo(() => statusFilter === "all" ? projectItems : projectItems.filter((issue) => (issue.displayStatus ?? issue.status) === statusFilter), [projectItems, statusFilter]);
  const currentFilter = filters.find((filter) => filter.status === statusFilter);

  return <>
    <main className="page-shell min-h-screen">
      <header className="page-header flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><div className="page-kicker"><span className="pulse-pin size-1.5 rounded-full bg-[#2563eb]" /><CircleDotDashed size={13} />{en ? "Live sync · every 15s" : "实时同步 · 每 15 秒"}</div><h1 className="page-title">{en ? "Issue list" : "缺陷列表"}</h1><p className="page-description">{en ? "Filter every report by repair state and open the item you need." : "按修复状态集中查看每一条反馈，快速进入需要处理的缺陷。"}</p></div>
        <span className="metric-chip self-start md:self-auto"><strong>{items.length}</strong>{en ? " total issues" : " 条缺陷"}</span>
      </header>
      {refreshError && <p role="alert" className="mb-5 rounded-xl border border-[#e2bfc0] bg-[#f8eaea] px-4 py-3 text-xs text-[#963a3a]">{refreshError}</p>}
      {initial.projects.length === 0 ? <div className="soft-empty p-10 text-center sm:p-14"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]"><CircleDotDashed size={21} /></span><h2 className="text-lg font-bold">{en ? "Create a project before capturing an issue" : "先创建项目，再从网页圈选问题"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6">{en ? "Projects connect captured pages to the right workspace." : "项目会把你圈选的网页自动送到正确的工作台。"}</p><a className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white" href={`/${locale}/app/projects`}>{en ? "Open projects" : "前往项目设置"}</a></div> : <>
        <section aria-label={en ? "Issue controls" : "缺陷筛选与操作"} className="mb-4 overflow-visible rounded-[1.35rem] border border-[#d5dee9] bg-white shadow-[0_14px_40px_rgba(30,50,80,.07)]">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-4">
            <div className="min-w-0 sm:w-[17rem]">
              <label htmlFor="project-filter" className="mb-1.5 block px-1 font-mono text-[9px] font-medium uppercase tracking-[.12em] text-[#7c899c]">{en ? "Project scope" : "项目范围"}</label>
              <Select id="project-filter" aria-label={en ? "Filter by project" : "按项目筛选"} value={projectId} onValueChange={setProjectId} options={[{ value: "all", label: en ? "All projects" : "全部项目" }, ...initial.projects.map((project) => ({ value: project.id, label: project.name }))]} />
            </div>
            <div className="flex items-center gap-2 sm:pb-px">
              <button title={en ? "Refresh" : "刷新"} aria-label={en ? "Refresh" : "刷新"} aria-busy={refreshing || undefined} disabled={refreshing} className="focus-ring icon-button border border-[#d5dee9] bg-[#f8fafc] text-[#65758b] transition-colors hover:border-[#9aaac0] hover:bg-white hover:text-[#172033] disabled:opacity-45" onClick={() => void refresh()}><RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} /></button>
              <Button className="flex-1 sm:flex-none" type="button" onClick={openManualCreate}><Plus size={16} />{en ? "Create issue" : "手动创建"}</Button>
            </div>
          </div>
          <div className="rounded-b-[1.3rem] border-t border-[#e4eaf1] bg-[#f8fafc]/80 px-3 py-2.5 sm:flex sm:items-center sm:gap-3 sm:px-4">
            <div className="mb-2 flex shrink-0 items-center gap-2 px-1 font-mono text-[9px] font-medium uppercase tracking-[.11em] text-[#7c899c] sm:mb-0"><ListFilter size={13} />{en ? "View" : "查看"}</div>
            <div className="min-w-0 sm:overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | DisplayStatus)} variant="segment">
                <TabsList className="flex w-full flex-wrap gap-1 bg-transparent p-0 sm:w-auto sm:min-w-max sm:flex-nowrap">
                  <TabsTrigger value="all" indicatorClassName="bg-[#172033] shadow-[0_5px_16px_rgba(15,23,42,.18)]" className="group focus-ring min-h-10 gap-2 px-3 text-xs">
                    <span className="size-1.5 rounded-full bg-[#2563eb]" /><span>{en ? "All" : "全部"}</span><span className="rounded-full bg-black/[.055] px-1.5 py-0.5 font-mono text-[9px] group-aria-selected:bg-white/15">{projectItems.length}</span>
                  </TabsTrigger>
                  {filters.map((filter) => <TabsTrigger key={filter.status} value={filter.status} indicatorClassName="bg-[#172033] shadow-[0_5px_16px_rgba(15,23,42,.18)]" className="group focus-ring min-h-10 gap-2 px-3 text-xs"><span className={`size-1.5 rounded-full ${filter.dot}`} /><span>{en ? filter.en : filter.zh}</span><span className="rounded-full bg-black/[.055] px-1.5 py-0.5 font-mono text-[9px] group-aria-selected:bg-white/15">{counts[filter.status]}</span></TabsTrigger>)}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </section>
        <section aria-live="polite" aria-label={en ? "Issue list" : "缺陷列表"} className="overflow-hidden rounded-[1.35rem] border border-[#d5dee9] bg-white shadow-[0_10px_34px_rgba(30,50,80,.055)]">
          <div className="flex items-end justify-between border-b border-[#e4eaf1] px-4 py-4 sm:px-5"><div><div className="font-mono text-[9px] font-medium uppercase tracking-[.12em] text-[#8693a5]">{en ? "Current queue" : "当前队列"}</div><h2 className="mt-1.5 text-base font-bold tracking-[-.02em] text-[#172033]">{statusFilter === "all" ? (en ? "All issues" : "全部缺陷") : (en ? currentFilter?.en : currentFilter?.zh)}</h2></div><span className="font-mono text-xs text-[#738096]"><strong className="text-[#172033]">{filtered.length}</strong> / {projectItems.length}</span></div>
          <div className="divide-y divide-[#e8edf3]">
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((issue) => <motion.div key={issue.id} layout={reduceMotion ? false : "position"} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }} transition={{ duration: reduceMotion ? 0.01 : 0.2 }}><IssueCard issue={issue} /></motion.div>)}
              {!filtered.length && <motion.div key="empty" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-44 place-items-center bg-[#fbfcfe] text-center"><div><CheckCircle2 className="mx-auto mb-2 text-[#71889a]" size={22} /><p className="text-sm font-semibold text-[#566579]">{en ? "No issues match this filter" : "此筛选条件下暂无缺陷"}</p><p className="mt-1 text-xs text-[#8a96a6]">{en ? "Try another status or project." : "可以换一个状态或项目查看。"}</p></div></motion.div>}
            </AnimatePresence>
          </div>
        </section>
      </>}
    </main>
    <Dialog open={showCreate} title={en ? "Create issue manually" : "手动创建缺陷"} description={en ? "Enter the page and problem details when browser capture is not available." : "无法通过扩展圈选时，直接填写页面和问题信息。"} onClose={() => { if (!createBusy) setShowCreate(false); }}>
      <form className="space-y-4" onSubmit={createManualIssue}>
        <label className="block text-xs font-semibold">{en ? "Project" : "项目"}
          <Select className="mt-1.5" aria-label={en ? "Issue project" : "缺陷所属项目"} value={manualProjectId} options={initial.projects.map((project) => ({ value: project.id, label: project.name }))} onValueChange={(value) => {
            const nextProject = initial.projects.find((project) => project.id === value);
            setManualProjectId(value);
            setManualPageUrl(nextProject?.origins[0] ?? "");
            setCreateError("");
          }} />
        </label>
        <label className="block text-xs font-semibold">{en ? "Page URL" : "页面网址"}
          <Input autoFocus className="mt-1.5 font-mono" type="url" inputMode="url" value={manualPageUrl} onChange={(event) => { setManualPageUrl(event.target.value); setCreateError(""); }} placeholder="https://example.com/page" required />
          <span className="mt-1.5 block text-[10px] font-normal leading-4 text-[#7d8790]">{selectedManualProject?.origins.length ? (en ? `Connected sites: ${selectedManualProject.origins.join(", ")}` : `已连接站点：${selectedManualProject.origins.join("、")}`) : (en ? "This project has no connected site yet." : "该项目尚未连接站点。")}</span>
        </label>
        <label className="block text-xs font-semibold">{en ? "Issue title" : "缺陷标题"}<Input className="mt-1.5" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} maxLength={200} required /></label>
        <label className="block text-xs font-semibold">{en ? "Issue description" : "缺陷描述"}<Textarea className="mt-1.5 min-h-48 font-mono text-xs leading-5" value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} maxLength={20_000} required /></label>
        {createError && <p role="alert" className="rounded-xl bg-[#f7e9e9] px-3 py-2 text-xs text-[#a33f3f]">{createError}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={createBusy} onClick={() => setShowCreate(false)}>{en ? "Cancel" : "取消"}</Button><Button type="submit" pending={createBusy} pendingLabel={en ? "Creating…" : "正在创建…"}><Plus size={15} />{en ? "Create issue" : "创建缺陷"}</Button></div>
      </form>
    </Dialog>
  </>;
}
