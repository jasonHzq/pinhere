import { and, desc, eq, isNull } from "drizzle-orm";
import { Bot, Check, Copy, KeyRound, LoaderCircle, Plus, RadioTower, RefreshCw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { data, useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/settings";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { getDatabase } from "~/db/client.server";
import { agentInstances, apiTokens, projects, webhooks } from "~/db/schema";
import { workspaceLoaderCache } from "~/lib/http-cache";
import { getPrincipal } from "~/lib/principal.server";
import { getCachedWorkspaceRoute, invalidateWorkspaceRouteCache } from "~/lib/workspace-route-cache";

export function headers() {
  return workspaceLoaderCache;
}

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [tokens, hooks, projectRows, agents] = await db.batch([
    db.select({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, scopes: apiTokens.scopes, lastUsedAt: apiTokens.lastUsedAt, createdAt: apiTokens.createdAt }).from(apiTokens).where(and(eq(apiTokens.userId, principal.userId), isNull(apiTokens.revokedAt))).orderBy(desc(apiTokens.createdAt)),
    db.select({ id: webhooks.id, name: webhooks.name, url: webhooks.url, enabled: webhooks.enabled, projectId: webhooks.projectId, version: webhooks.version }).from(webhooks).where(eq(webhooks.userId, principal.userId)),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.userId, principal.userId)),
    db.select({ id: agentInstances.id, name: agentInstances.name, platform: agentInstances.platform, harness: agentInstances.harness, version: agentInstances.version, lastSeenAt: agentInstances.lastSeenAt, createdAt: agentInstances.createdAt }).from(agentInstances).where(eq(agentInstances.userId, principal.userId)).orderBy(desc(agentInstances.lastSeenAt))
  ]);
  return data({ tokens, hooks, projects: projectRows, agents }, { headers: workspaceLoaderCache });
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  return getCachedWorkspaceRoute(request, serverLoader);
}
clientLoader.hydrate = true as const;

export default function Settings() {
  const initial = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const [tokens, setTokens] = useState(initial.tokens);
  const [hooks, setHooks] = useState(initial.hooks);
  const [tokenName, setTokenName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [hookName, setHookName] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null);

  async function createToken(event: React.FormEvent) {
    event.preventDefault(); if (busyAction) return;
    setBusyAction("token:create"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/v1/tokens", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: tokenName }) });
      const body = await response.json().catch(() => null);
      if (response.ok) { invalidateWorkspaceRouteCache(); setNewToken(body.data.token); setTokens((current) => [{ ...body.data, createdAt: new Date().toISOString(), lastUsedAt: null }, ...current]); setTokenName(""); }
      else setError(body?.error?.message ?? (en ? "Token creation failed." : "Token 创建失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function revokeToken(id: string) {
    if (busyAction) return;
    setBusyAction("confirm"); setConfirmError("");
    try {
      const response = await fetch(`/api/v1/tokens/${id}`, { method: "DELETE" });
      if (response.ok) { invalidateWorkspaceRouteCache(); setTokens((current) => current.filter((token) => token.id !== id)); setConfirmation(null); setNotice(en ? "Token revoked." : "Token 已撤销。"); }
      else setConfirmError(en ? "Token revocation failed." : "Token 撤销失败，请重试。");
    } catch { setConfirmError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function createHook(event: React.FormEvent) {
    event.preventDefault(); if (busyAction) return;
    setBusyAction("hook:create"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/v1/webhooks", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: hookName, url: hookUrl, projectId: projectId || undefined }) });
      const body = await response.json().catch(() => null);
      if (response.ok) { invalidateWorkspaceRouteCache(); setSecret(body.data.secret); setHooks((current) => [{ ...body.data, secret: undefined }, ...current]); setHookName(""); setHookUrl(""); setNotice(en ? "Webhook created." : "Webhook 已创建。"); }
      else setError(body?.error?.message ?? (en ? "Webhook creation failed." : "Webhook 创建失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function removeHook(hook: typeof hooks[number]) {
    if (busyAction) return;
    setBusyAction("confirm"); setConfirmError("");
    try {
      const response = await fetch(`/api/v1/webhooks/${hook.id}`, { method: "DELETE", headers: { "X-Pinhere-If-Match": `\"${hook.version}\"` } });
      if (response.ok) { invalidateWorkspaceRouteCache(); setHooks((current) => current.filter((item) => item.id !== hook.id)); setConfirmation(null); setNotice(en ? "Webhook removed." : "Webhook 已删除。"); }
      else setConfirmError(en ? "Webhook removal failed." : "Webhook 删除失败，请重试。");
    } catch { setConfirmError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function toggleHook(hook: typeof hooks[number]) {
    const key = `hook:${hook.id}:toggle`; if (busyAction) return;
    setBusyAction(key); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/webhooks/${hook.id}`, { method: "PATCH", headers: { "content-type": "application/json", "X-Pinhere-If-Match": `\"${hook.version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ enabled: !hook.enabled }) });
      const body = await response.json().catch(() => null);
      if (response.ok) { invalidateWorkspaceRouteCache(); setHooks((current) => current.map((item) => item.id === hook.id ? { ...item, ...body.data } : item)); setNotice(en ? "Webhook updated." : "Webhook 状态已更新。"); }
      else setError(body?.error?.message ?? (en ? "Webhook update failed." : "Webhook 更新失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function testHook(hook: typeof hooks[number]) {
    const key = `hook:${hook.id}:test`; if (busyAction) return;
    setBusyAction(key); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/webhooks/${hook.id}/test`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: "{}" });
      const body = await response.json().catch(() => null);
      if (response.ok) setNotice(en ? `Test sent to ${hook.name}.` : `测试事件已发送至「${hook.name}」。`);
      else setError(body?.error?.message ?? (en ? "Webhook test failed." : "Webhook 测试失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function rotateHook(hook: typeof hooks[number]) {
    const key = `hook:${hook.id}:rotate`; if (busyAction) return;
    setBusyAction(key); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/webhooks/${hook.id}/rotate-secret`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: "{}" });
      const body = await response.json().catch(() => null);
      if (response.ok) { invalidateWorkspaceRouteCache(); setSecret(body.data.secret); setNotice(en ? "Signing secret rotated." : "签名 Secret 已轮换。"); }
      else setError(body?.error?.message ?? (en ? "Secret rotation failed." : "Secret 轮换失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  const onlineAgents = initial.agents.filter((agent) => agent.lastSeenAt && Date.now() - new Date(agent.lastSeenAt).getTime() < 90_000).length;

  return <>
    <main className="page-shell min-h-screen">
      <header className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-kicker"><RadioTower size={13} />Agent handoff</div>
          <h1 className="page-title">{en ? "Automation" : "自动化设置"}</h1>
          <p className="page-description">{en ? "Manage credentials, event delivery, and agent health in one control center." : "在一个控制中心管理访问凭证、事件推送和 Agent 运行状态。"}</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label={en ? "Automation overview" : "自动化概览"}>
          <span className="metric-chip"><strong>{tokens.length}</strong> Tokens</span>
          <span className="metric-chip"><strong>{hooks.filter((hook) => hook.enabled).length}</strong>{en ? " active hooks" : " 个启用 Hook"}</span>
          <span className="metric-chip"><strong>{onlineAgents}</strong>{en ? " agents online" : " 个 Agent 在线"}</span>
        </div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-xl border border-[#e2bfc0] bg-[#f8eaea] px-4 py-3 text-xs text-[#963a3a]">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-[#bed8c8] bg-[#edf7f1] px-4 py-3 text-xs text-[#356347]">{notice}</p>}

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <section className="xl:col-span-5">
          <Card className="h-full overflow-hidden border-[#cfd9e4] shadow-[0_12px_36px_rgba(15,23,42,.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#dbe5ef] bg-white text-[#2563eb] shadow-[0_2px_8px_rgba(15,23,42,.04)]"><KeyRound size={16} /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold tracking-[-.01em] text-[#172033]">{en ? "Access tokens" : "访问令牌"}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-[#7a8791]">{en ? "Credentials used by coding agents" : "供 Coding Agent 安全访问工作区"}</p>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[.12em] text-[#8a97a8]">01 / access</span>
            </div>

            <div className="p-4 sm:p-5">
              <form onSubmit={createToken} className="flex flex-col gap-2 sm:flex-row">
                <Input value={tokenName} onChange={(e) => { setTokenName(e.target.value); setError(""); }} placeholder={en ? "Agent on checkout repo" : "例如：商城仓库 Agent"} required />
                <Button pending={busyAction === "token:create"} pendingLabel={en ? "Creating…" : "正在创建…"}><Plus size={16} />{en ? "Create" : "创建"}</Button>
              </form>
              {newToken && <div className="mt-3 rounded-xl border border-[#bfd0e0] bg-[#edf4fb] p-3">
                <div className="text-[11px] font-bold text-[#405f70]">{en ? "Copy now. It will not be shown again." : "请立即复制，此 Token 不会再次显示。"}</div>
                <button onClick={() => void copy(newToken)} className="focus-ring mt-2 flex min-h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-[#172033] px-3 py-2 text-left font-mono text-[10px] text-white!">
                  <span className="truncate">{newToken}</span>{copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>}
              <div className="mt-3 space-y-1.5 border-t border-[#e4e9ee] pt-3">
                {tokens.map((token) => <div key={token.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#dbe3eb] bg-[#f8fafc] px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[#273548]">{token.name}</div>
                    <div className="mt-1 truncate font-mono text-[9px] text-[#7d8790]">{token.prefix}•••• · {token.scopes.join(", ")}</div>
                  </div>
                  <button aria-label={en ? "Revoke token" : "撤销 Token"} disabled={Boolean(busyAction)} className="focus-ring grid size-9 shrink-0 place-items-center rounded-lg text-[#919aa2] transition-colors hover:bg-[#f5e8e8] hover:text-[#a93e3e] disabled:opacity-45" onClick={() => { setConfirmError(""); setConfirmation({ title: en ? "Revoke this token?" : "撤销这个 Token？", description: en ? `${token.name} will immediately lose API access.` : `「${token.name}」会立即失去 API 访问权限。`, action: () => revokeToken(token.id) }); }}><Trash2 size={14} /></button>
                </div>)}
                {!tokens.length && <div className="soft-empty rounded-xl! px-4 py-4 text-center text-xs">{en ? "No active tokens." : "暂无有效 Token。"}</div>}
              </div>
            </div>
          </Card>
        </section>

        <section className="xl:col-span-7">
          <Card className="h-full overflow-hidden border-[#cfd9e4] shadow-[0_12px_36px_rgba(15,23,42,.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#dbe5ef] bg-white text-[#2563eb] shadow-[0_2px_8px_rgba(15,23,42,.04)]"><RadioTower size={16} /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold tracking-[-.01em] text-[#172033]">{en ? "Event delivery" : "事件推送"}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-[#7a8791]">{en ? "Send issue.created to external services" : "将 issue.created 发送到外部服务"}</p>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[.12em] text-[#8a97a8]">02 / delivery</span>
            </div>

            <div className="p-4 sm:p-5">
              <form onSubmit={createHook} className="grid gap-2 sm:grid-cols-[minmax(0,.8fr)_minmax(0,.72fr)_minmax(0,1.35fr)_auto]">
                <Input value={hookName} onChange={(e) => { setHookName(e.target.value); setError(""); }} placeholder={en ? "Webhook name" : "Webhook 名称"} required />
                <Select aria-label={en ? "Project scope" : "项目范围"} value={projectId} onValueChange={setProjectId} options={[{ value: "", label: en ? "All projects" : "全部项目" }, ...initial.projects.map((project) => ({ value: project.id, label: project.name }))]} />
                <Input value={hookUrl} onChange={(e) => { setHookUrl(e.target.value); setError(""); }} placeholder="https://agent.example.com/pinhere" type="url" required />
                <Button pending={busyAction === "hook:create"} pendingLabel={en ? "Creating…" : "正在创建…"}><Plus size={16} />{en ? "Create" : "创建"}</Button>
              </form>
              {secret && <div className="mt-3 rounded-xl border border-[#bfd0e0] bg-[#edf4fb] p-3">
                <div className="text-[11px] font-bold text-[#405f70]">{en ? "Signing secret — shown once" : "签名 Secret，仅显示一次"}</div>
                <button onClick={() => void copy(secret)} className="focus-ring mt-2 flex min-h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-[#172033] px-3 py-2 text-left font-mono text-[10px] text-white!"><span className="truncate">{secret}</span><Copy size={14} /></button>
              </div>}
              <div className="mt-3 space-y-1.5 border-t border-[#e4e9ee] pt-3">
                {hooks.map((hook) => {
                  const toggleKey = `hook:${hook.id}:toggle`;
                  const testKey = `hook:${hook.id}:test`;
                  const rotateKey = `hook:${hook.id}:rotate`;
                  return <div key={hook.id} className="flex flex-col gap-2 rounded-lg border border-[#dbe3eb] bg-[#f8fafc] px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#273548]"><span className={`size-1.5 shrink-0 rounded-full ${hook.enabled ? "bg-[#1f9d68]" : "bg-[#aab2ba]"}`} />{hook.name}</div>
                      <div className="mt-1 truncate font-mono text-[9px] text-[#7d8790]">{hook.url}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Button size="sm" variant="outline" pending={busyAction === toggleKey} pendingLabel={en ? "Saving…" : "保存中…"} disabled={Boolean(busyAction)} onClick={() => void toggleHook(hook)}>{hook.enabled ? (en ? "Disable" : "停用") : (en ? "Enable" : "启用")}</Button>
                      <Button size="sm" variant="outline" disabled={Boolean(busyAction)} onClick={() => void testHook(hook)}>{busyAction === testKey ? <LoaderCircle className="animate-spin" size={13} /> : <Send size={13} />}{en ? "Test" : "测试"}</Button>
                      <Button size="sm" variant="ghost" disabled={Boolean(busyAction)} onClick={() => void rotateHook(hook)}>{busyAction === rotateKey ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />}{en ? "Rotate" : "轮换"}</Button>
                      <button aria-label={en ? "Remove webhook" : "删除 Webhook"} disabled={Boolean(busyAction)} className="focus-ring grid size-9 place-items-center rounded-lg text-[#919aa2] transition-colors hover:bg-[#f5e8e8] hover:text-[#a93e3e] disabled:opacity-45" onClick={() => { setConfirmError(""); setConfirmation({ title: en ? "Remove this webhook?" : "删除这个 Webhook？", description: en ? `${hook.name} will stop receiving issue events.` : `「${hook.name}」将不再接收缺陷事件。`, action: () => removeHook(hook) }); }}><Trash2 size={14} /></button>
                    </div>
                  </div>;
                })}
                {!hooks.length && <div className="soft-empty rounded-xl! px-4 py-4 text-center text-xs">{en ? "No webhooks configured." : "暂无 Webhook。"}</div>}
              </div>
            </div>
          </Card>
        </section>

        <section className="xl:col-span-12">
          <Card className="overflow-hidden border-[#cfd9e4] shadow-[0_12px_36px_rgba(15,23,42,.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#dbe5ef] bg-white text-[#2563eb] shadow-[0_2px_8px_rgba(15,23,42,.04)]"><Bot size={16} /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold tracking-[-.01em] text-[#172033]">{en ? "Agent health" : "Agent 状态"}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-[#7a8791]">{en ? "Paired runtimes and heartbeat" : "已配对运行时与最后心跳"}</p>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[.12em] text-[#8a97a8]">03 / agents</span>
            </div>

            <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[#d8e4ef] bg-[#edf4fb] px-4 py-3">
                  <div className="font-display text-2xl font-bold leading-none text-[#294a5e]">{initial.agents.length}</div>
                  <div className="mt-1.5 text-[10px] font-medium text-[#71808b]">{en ? "Paired runtimes" : "已配对运行时"}</div>
                </div>
                <div className="rounded-xl border border-[#d6e7de] bg-[#edf7f1] px-4 py-3">
                  <div className="font-display text-2xl font-bold leading-none text-[#28724f]">{onlineAgents}</div>
                  <div className="mt-1.5 text-[10px] font-medium text-[#71808b]">{en ? "Online now" : "当前在线"}</div>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {initial.agents.map((agent) => {
                  const online = agent.lastSeenAt && Date.now() - new Date(agent.lastSeenAt).getTime() < 90_000;
                  return <div key={agent.id} className="min-w-0 rounded-xl border border-[#dbe3eb] bg-[#f8fafc] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-xs font-bold text-[#273548]">{agent.name}</div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-[.06em] ${online ? "bg-[#ddf3e7] text-[#18704a]" : "bg-[#e8ebee] text-[#747f88]"}`}><span className={`size-1.5 rounded-full ${online ? "bg-[#1f9d68]" : "bg-[#9ba4ad]"}`} />{online ? (en ? "online" : "在线") : (en ? "offline" : "离线")}</span>
                    </div>
                    <div className="mt-2 truncate font-mono text-[9px] text-[#747f88]">{agent.harness} · {agent.platform}{agent.version ? ` · v${agent.version}` : ""}</div>
                    <div className="mt-1.5 truncate text-[10px] text-[#687680]">{agent.lastSeenAt ? `${en ? "Last seen" : "最后心跳"}: ${new Date(agent.lastSeenAt).toLocaleString()}` : (en ? "Waiting for first heartbeat" : "等待首次心跳")}</div>
                  </div>;
                })}
                {!initial.agents.length && <div className="soft-empty rounded-xl! px-4 py-4 text-center text-xs md:col-span-2 2xl:col-span-3">{en ? "No paired agents. Run pinhere auth login in a terminal." : "暂无已配对 Agent。请在终端运行 pinhere auth login。"}</div>}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? ""} description={confirmation?.description ?? ""} confirmLabel={en ? "Confirm" : "确认"} cancelLabel={en ? "Cancel" : "取消"} busy={busyAction === "confirm"} error={confirmError} onClose={() => { if (busyAction !== "confirm") setConfirmation(null); }} onConfirm={() => { if (confirmation) void confirmation.action(); }} />
  </>;
}
