import { desc, eq } from "drizzle-orm";
import { Activity, ArrowDown, Bot, Check, ChevronRight, CircleDot, Copy, Cpu, ExternalLink, KeyRound, RadioTower, ServerCog, Sparkles, TerminalSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { data, Link, useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/agent-access";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Select } from "~/components/ui/select";
import { getDatabase } from "~/db/client.server";
import { agentInstances, agentRuns, projects } from "~/db/schema";
import { buildAgentAccessPrompt, type AgentAccessMode } from "~/lib/agent-access";
import { workspaceLoaderCache } from "~/lib/http-cache";
import { cn } from "~/lib/cn";
import { getPrincipal } from "~/lib/principal.server";
import { getCachedWorkspaceRoute } from "~/lib/workspace-route-cache";

export function headers() {
  return workspaceLoaderCache;
}

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [projectRows, agents, recentRuns] = await db.batch([
    db.select({ id: projects.id, name: projects.name, identifier: projects.identifier }).from(projects).where(eq(projects.userId, principal.userId)).orderBy(desc(projects.updatedAt)),
    db.select({ id: agentInstances.id, name: agentInstances.name, platform: agentInstances.platform, harness: agentInstances.harness, version: agentInstances.version, lastSeenAt: agentInstances.lastSeenAt, createdAt: agentInstances.createdAt }).from(agentInstances).where(eq(agentInstances.userId, principal.userId)).orderBy(desc(agentInstances.lastSeenAt)),
    db.select({ id: agentRuns.id, agentInstanceId: agentRuns.agentInstanceId, status: agentRuns.status, updatedAt: agentRuns.updatedAt }).from(agentRuns).where(eq(agentRuns.userId, principal.userId)).orderBy(desc(agentRuns.updatedAt)).limit(50)
  ]);
  const capturedAt = Date.now();
  return data({
    origin: new URL(request.url).origin,
    projects: projectRows,
    capturedAt,
    agents: agents.map((agent) => ({ ...agent, online: Boolean(agent.lastSeenAt && capturedAt - agent.lastSeenAt.getTime() < 90_000), recentRuns: recentRuns.filter((run) => run.agentInstanceId === agent.id).slice(0, 5) }))
  }, { headers: workspaceLoaderCache });
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  return getCachedWorkspaceRoute(request, serverLoader);
}
clientLoader.hydrate = true as const;

const modes: Array<{
  id: AgentAccessMode;
  icon: typeof Bot;
  index: string;
  zh: string;
  en: string;
  zhDescription: string;
  enDescription: string;
  zhFor: string;
  enFor: string;
}> = [
  { id: "autopilot", icon: RadioTower, index: "01", zh: "自动值守", en: "Autopilot", zhDescription: "CLI 常驻监听新缺陷，自动唤起本地 Agent 修复并回写结果。", enDescription: "A resident CLI watches for new issues, starts the local agent, and reports results.", zhFor: "适合持续迭代的产品仓库", enFor: "Best for actively developed products" },
  { id: "on-demand", icon: TerminalSquare, index: "02", zh: "按需协作", en: "On demand", zhDescription: "安装 CLI 与 Skill，但只在你发起任务时读取和处理 Pinhere 缺陷。", enDescription: "Install the CLI and skill, then process Pinhere issues only when you ask.", zhFor: "适合先体验或需要人工把关", enFor: "Best for trials and supervised work" },
  { id: "custom", icon: ServerCog, index: "03", zh: "自定义工作流", en: "Custom workflow", zhDescription: "用 API 与 Webhook 把缺陷接到已有机器人、队列或内部平台。", enDescription: "Use the API and webhooks to connect an existing bot, queue, or internal platform.", zhFor: "适合已有 Agent 基础设施的团队", enFor: "Best for teams with agent infrastructure" }
];

function relativeTime(value: string | Date | null, capturedAt: number, en: boolean) {
  if (!value) return en ? "No heartbeat yet" : "尚无心跳";
  const seconds = Math.max(0, Math.floor((capturedAt - new Date(value).getTime()) / 1000));
  if (seconds < 10) return en ? "just now" : "刚刚";
  if (seconds < 60) return en ? `${seconds}s ago` : `${seconds} 秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return en ? `${minutes}m ago` : `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return en ? `${hours}h ago` : `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return en ? `${days}d ago` : `${days} 天前`;
}

export default function AgentAccess() {
  const initial = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const [mode, setMode] = useState<AgentAccessMode>("autopilot");
  const [projectIdentifier, setProjectIdentifier] = useState(initial.projects[0]?.identifier ?? "");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const onlineAgents = initial.agents.filter((agent) => agent.online);
  const completedRuns = initial.agents.flatMap((agent) => agent.recentRuns).filter((run) => run.status === "succeeded").length;
  const prompt = useMemo(() => buildAgentAccessPrompt({ en, mode, origin: initial.origin, projectIdentifier }), [en, initial.origin, mode, projectIdentifier]);
  const selectedMode = modes.find((item) => item.id === mode)!;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
    }
  }

  return <main className="page-shell min-h-screen">
    <header className="page-header flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="page-kicker"><Sparkles size={13} />Agent relay</div>
        <h1 className="page-title">{en ? "Connect an agent" : "Agent 接入"}</h1>
        <p className="page-description">{en ? "Choose how Pinhere hands browser feedback to your coding agent. Copy one prompt and let the agent complete the setup." : "选择 Pinhere 如何把浏览器反馈交给你的 Coding Agent。复制一段提示词，让 Agent 自己完成安装、配对和验证。"}</p>
      </div>
      <nav className="inline-flex w-fit rounded-xl border border-[#d9e2ec] bg-white/75 p-1 text-xs font-semibold shadow-[0_6px_18px_rgba(15,23,42,.04)]" aria-label={en ? "Page sections" : "页面分区"}>
        <a className="focus-ring rounded-lg bg-[#172033] px-3.5 py-2 text-white" href="#setup">{en ? "Setup guide" : "接入指南"}</a>
        <a className="focus-ring rounded-lg px-3.5 py-2 text-[#66758a] transition-colors hover:bg-[#eef3fb] hover:text-[#172033]" href="#status">{en ? "Connection status" : "接入状态"}</a>
      </nav>
    </header>

    <section id="setup" className="scroll-mt-6">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div><div className="font-mono text-[9px] font-medium uppercase tracking-[.14em] text-[#2563eb]">01 / Choose a relay</div><h2 className="mt-1.5 text-lg font-bold tracking-[-.025em] text-[#172033]">{en ? "How should the agent work?" : "希望 Agent 如何工作？"}</h2></div>
        <span className="hidden text-xs text-[#7a8791] sm:block">{en ? "You can change this later" : "之后可以随时切换"}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {modes.map((item) => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setCopyState("idle"); }} className={cn("focus-ring group relative overflow-hidden rounded-2xl border bg-white/82 p-5 text-left shadow-[0_8px_25px_rgba(15,23,42,.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#aabbd2] hover:shadow-[0_14px_34px_rgba(15,23,42,.075)]", mode === item.id ? "border-[#2563eb] ring-1 ring-[#2563eb]" : "border-[#d9e2ec]")}>
          <div className="flex items-start justify-between gap-3"><span className={cn("grid size-10 place-items-center rounded-xl transition-colors", mode === item.id ? "bg-[#172033] text-white" : "bg-[#edf3f9] text-[#526986] group-hover:bg-[#e1ebf8]")}><item.icon size={18} /></span><span className="font-mono text-[9px] tracking-[.12em] text-[#8a97a9]">{item.index}</span></div>
          <h3 className="mt-5 text-base font-bold tracking-[-.02em] text-[#172033]">{en ? item.en : item.zh}</h3>
          <p className="mt-2 min-h-10 text-xs leading-5 text-[#66758a]">{en ? item.enDescription : item.zhDescription}</p>
          <div className="mt-4 border-t border-[#e4eaf1] pt-3 text-[10px] font-medium text-[#718096]">{en ? item.enFor : item.zhFor}</div>
          {mode === item.id && <span className="absolute bottom-0 left-0 h-1 w-full bg-[#2563eb]" />}
        </button>)}
      </div>

      <div className="mt-4 grid overflow-hidden rounded-[1.35rem] border border-[#cbd8e6] bg-[#111a29] shadow-[0_26px_70px_rgba(15,23,42,.16)] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white"><Bot size={17} /></span><div><div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#8fa7c7]">Prompt handoff</div><h3 className="mt-1 text-sm font-bold text-white">{en ? `Give this to your agent · ${selectedMode.en}` : `把这段话发给你的 Agent · ${selectedMode.zh}`}</h3></div></div>
            <Button type="button" variant="outline" className="border-white/15 bg-white/7 text-white hover:bg-white/12 hover:text-white" onClick={() => void copyPrompt()}>
              {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />}{copyState === "copied" ? (en ? "Copied" : "已复制") : (en ? "Copy prompt" : "复制提示词")}
            </Button>
          </div>
          <pre className="mt-5 max-h-[25rem] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-6 text-[#c8d5e7] [scrollbar-color:#41516a_transparent]">{prompt}</pre>
          {copyState === "error" && <p role="alert" className="mt-3 text-xs text-[#f0a7a7]">{en ? "Clipboard access was blocked. Select the text and copy it manually." : "浏览器阻止了剪贴板访问，请手动选中文字复制。"}</p>}
        </div>
        <aside className="border-t border-white/10 bg-white/[.035] p-5 xl:border-l xl:border-t-0 xl:p-6">
          <div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#8fa7c7]">{en ? "Before you copy" : "复制前确认"}</div>
          <div className="mt-4">
            {initial.projects.length ? <><label className="text-xs font-semibold text-white" htmlFor="agent-project">{en ? "Target project" : "目标项目"}</label><Select id="agent-project" className="mt-2 border-white/15 bg-[#1a2536] text-white" value={projectIdentifier} onValueChange={setProjectIdentifier} options={initial.projects.map((project) => ({ value: project.identifier, label: `${project.name} · ${project.identifier}` }))} /></> : <div className="rounded-xl border border-[#d9a952]/30 bg-[#d9a952]/10 p-3"><div className="text-xs font-bold text-[#f3d89e]">{en ? "Create a project first" : "请先创建项目"}</div><p className="mt-1.5 text-[11px] leading-5 text-[#b9c7d9]">{en ? "The agent needs a project identifier to bind this repository." : "Agent 需要项目标识，才能把当前仓库与反馈对应起来。"}</p><Link className="focus-ring mt-3 inline-flex items-center gap-1 text-xs font-bold text-white" to={`/${locale}/app/projects`}>{en ? "Go to projects" : "前往我的项目"}<ChevronRight size={13} /></Link></div>}
          </div>
          <ol className="mt-5 space-y-3 border-t border-white/10 pt-5">
            {[en ? "Agent reads the latest setup contract" : "Agent 读取最新接入规范", en ? "CLI opens a safe browser pairing" : "CLI 发起安全的浏览器配对", en ? "Agent verifies the complete connection" : "Agent 自动验证完整链路"].map((label, index) => <li key={label} className="flex gap-3 text-[11px] leading-5 text-[#b9c7d9]"><span className="grid size-5 shrink-0 place-items-center rounded-full border border-white/15 font-mono text-[8px] text-white">{index + 1}</span>{label}</li>)}
          </ol>
          <a className="focus-ring mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#a9c8ff] hover:text-white" href={`${initial.origin}/.well-known/pinhere-skill-install.md`} target="_blank" rel="noreferrer">{en ? "Read setup contract" : "查看接入规范"}<ExternalLink size={12} /></a>
        </aside>
      </div>
    </section>

    <div className="my-8 flex items-center gap-3 text-[#a0adbd]" aria-hidden="true"><span className="h-px flex-1 bg-[#d9e2ec]" /><ArrowDown size={14} /><span className="h-px flex-1 bg-[#d9e2ec]" /></div>

    <section id="status" className="scroll-mt-6 pb-8">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="font-mono text-[9px] font-medium uppercase tracking-[.14em] text-[#2563eb]">02 / Signal check</div><h2 className="mt-1.5 text-lg font-bold tracking-[-.025em] text-[#172033]">{en ? "Connection status" : "接入状态"}</h2></div>
        <div className="flex items-center gap-2 text-xs text-[#718096]"><span className={cn("size-2 rounded-full", onlineAgents.length ? "pulse-pin bg-[#22a06b]" : "bg-[#aab4c0]")} />{onlineAgents.length ? (en ? `${onlineAgents.length} agent online now` : `${onlineAgents.length} 个 Agent 当前在线`) : (en ? "No live heartbeat" : "暂无在线心跳")}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="relative overflow-hidden p-5"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#eaf1ff] text-[#2563eb]"><KeyRound size={17} /></span><span className="rounded-full bg-[#e7f6ed] px-2 py-1 font-mono text-[8px] uppercase tracking-[.08em] text-[#19734d]">{en ? "ready" : "已就绪"}</span></div><div className="mt-5 font-display text-2xl font-bold text-[#172033]">{en ? "Workspace" : "工作台账号"}</div><p className="mt-1 text-xs leading-5 text-[#718096]">{en ? "Signed in and ready to approve agent pairing." : "已登录，可批准 Agent 发起的配对。"}</p></Card>
        <Card className="relative overflow-hidden p-5"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#edf3f9] text-[#526986]"><Cpu size={17} /></span><span className={cn("rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-[.08em]", initial.agents.length ? "bg-[#eaf1ff] text-[#255cc1]" : "bg-[#eef1f4] text-[#778391]")}>{initial.agents.length ? (en ? "paired" : "已配对") : (en ? "waiting" : "待接入")}</span></div><div className="mt-5 font-display text-2xl font-bold text-[#172033]">{initial.agents.length}<span className="ml-1 text-sm font-medium text-[#8190a3]">Agent</span></div><p className="mt-1 text-xs leading-5 text-[#718096]">{en ? "CLI runtimes paired with this workspace." : "已与当前工作台配对的 CLI 运行时。"}</p></Card>
        <Card className="relative overflow-hidden p-5"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#eaf6f0] text-[#287558]"><Activity size={17} /></span><span className={cn("rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-[.08em]", onlineAgents.length ? "bg-[#e7f6ed] text-[#19734d]" : "bg-[#eef1f4] text-[#778391]")}>{onlineAgents.length ? (en ? "live" : "在线") : (en ? "quiet" : "无心跳")}</span></div><div className="mt-5 font-display text-2xl font-bold text-[#172033]">{onlineAgents.length}<span className="ml-1 text-sm font-medium text-[#8190a3]">{en ? "online" : "在线"}</span></div><p className="mt-1 text-xs leading-5 text-[#718096]">{en ? `${completedRuns} successful run(s) in the latest agent activity.` : `最近 Agent 活动中有 ${completedRuns} 次成功运行。`}</p></Card>
      </div>

      <Card className="mt-3 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-[#e4eaf1] px-5 py-4"><div><div className="font-mono text-[9px] uppercase tracking-[.12em] text-[#8693a5]">Runtime registry</div><h3 className="mt-1 text-sm font-bold text-[#172033]">{en ? "Paired runtimes" : "已配对运行时"}</h3></div><span className="font-mono text-[10px] text-[#8a97a9]">{initial.agents.length} total</span></div>
        {initial.agents.length ? <div className="divide-y divide-[#e4eaf1]">{initial.agents.map((agent) => <div key={agent.id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#f8fafe] md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-6"><div className="flex min-w-0 items-center gap-3"><span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", agent.online ? "bg-[#e7f6ed] text-[#247052]" : "bg-[#edf1f5] text-[#738096]")}><Bot size={17} /><span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white", agent.online ? "bg-[#22a06b]" : "bg-[#aab4c0]")} /></span><div className="min-w-0"><div className="truncate text-sm font-bold text-[#172033]">{agent.name}</div><div className="mt-1 truncate font-mono text-[9px] text-[#8190a3]">{agent.harness} · {agent.platform}{agent.version ? ` · v${agent.version}` : ""}</div></div></div><div className="flex items-center gap-2 text-xs text-[#66758a]"><CircleDot size={12} className={agent.online ? "text-[#22a06b]" : "text-[#9ba6b3]"} />{agent.online ? (en ? "Heartbeat active" : "心跳正常") : (en ? "Heartbeat stopped" : "心跳已停止")}</div><div className="font-mono text-[10px] text-[#8190a3]">{relativeTime(agent.lastSeenAt, initial.capturedAt, en)}</div></div>)}</div> : <div className="grid min-h-48 place-items-center px-5 py-10 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf3f9] text-[#60758e]"><Bot size={20} /></span><h3 className="mt-4 text-sm font-bold text-[#172033]">{en ? "No agent paired yet" : "还没有 Agent 接入"}</h3><p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#718096]">{en ? "Choose a setup mode above, copy its prompt, and give it to the coding agent in your repository." : "在上方选择接入方式，复制提示词并交给当前仓库里的 Coding Agent。完成配对后，这里会显示它的心跳。"}</p><a className="focus-ring mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#2563eb]" href="#setup">{en ? "Start setup" : "开始接入"}<ChevronRight size={13} /></a></div></div>}
      </Card>
      <p className="mt-3 text-[11px] leading-5 text-[#8190a3]">{en ? "Repository bindings are stored locally on each agent machine. Run `pinhere agent status` there for the authoritative project path and permission mode." : "仓库绑定保存在各 Agent 机器本地。如需确认项目路径和权限模式，请在对应机器运行 `pinhere agent status`。"}</p>
    </section>
  </main>;
}
