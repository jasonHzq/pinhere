import { and, desc, eq, isNull } from "drizzle-orm";
import { Bot, Check, Copy, KeyRound, LoaderCircle, Plus, RadioTower, RefreshCw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/settings";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { getDatabase } from "~/db/client.server";
import { agentInstances, apiTokens, projects, webhooks } from "~/db/schema";
import { getPrincipal } from "~/lib/principal.server";

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [tokens, hooks, projectRows, agents] = await Promise.all([
    db.select({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, scopes: apiTokens.scopes, lastUsedAt: apiTokens.lastUsedAt, createdAt: apiTokens.createdAt }).from(apiTokens).where(and(eq(apiTokens.userId, principal.userId), isNull(apiTokens.revokedAt))).orderBy(desc(apiTokens.createdAt)),
    db.select({ id: webhooks.id, name: webhooks.name, url: webhooks.url, enabled: webhooks.enabled, projectId: webhooks.projectId, version: webhooks.version }).from(webhooks).where(eq(webhooks.userId, principal.userId)),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.userId, principal.userId)),
    db.select({ id: agentInstances.id, name: agentInstances.name, platform: agentInstances.platform, harness: agentInstances.harness, version: agentInstances.version, lastSeenAt: agentInstances.lastSeenAt, createdAt: agentInstances.createdAt }).from(agentInstances).where(eq(agentInstances.userId, principal.userId)).orderBy(desc(agentInstances.lastSeenAt))
  ]);
  return { tokens, hooks, projects: projectRows, agents };
}

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
      if (response.ok) { setNewToken(body.data.token); setTokens((current) => [{ ...body.data, createdAt: new Date().toISOString(), lastUsedAt: null }, ...current]); setTokenName(""); }
      else setError(body?.error?.message ?? (en ? "Token creation failed." : "Token 创建失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function revokeToken(id: string) {
    if (busyAction) return;
    setBusyAction("confirm"); setConfirmError("");
    try {
      const response = await fetch(`/api/v1/tokens/${id}`, { method: "DELETE" });
      if (response.ok) { setTokens((current) => current.filter((token) => token.id !== id)); setConfirmation(null); setNotice(en ? "Token revoked." : "Token 已撤销。"); }
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
      if (response.ok) { setSecret(body.data.secret); setHooks((current) => [{ ...body.data, secret: undefined }, ...current]); setHookName(""); setHookUrl(""); setNotice(en ? "Webhook created." : "Webhook 已创建。"); }
      else setError(body?.error?.message ?? (en ? "Webhook creation failed." : "Webhook 创建失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function removeHook(hook: typeof hooks[number]) {
    if (busyAction) return;
    setBusyAction("confirm"); setConfirmError("");
    try {
      const response = await fetch(`/api/v1/webhooks/${hook.id}`, { method: "DELETE", headers: { "If-Match": `\"${hook.version}\"` } });
      if (response.ok) { setHooks((current) => current.filter((item) => item.id !== hook.id)); setConfirmation(null); setNotice(en ? "Webhook removed." : "Webhook 已删除。"); }
      else setConfirmError(en ? "Webhook removal failed." : "Webhook 删除失败，请重试。");
    } catch { setConfirmError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function toggleHook(hook: typeof hooks[number]) {
    const key = `hook:${hook.id}:toggle`; if (busyAction) return;
    setBusyAction(key); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/webhooks/${hook.id}`, { method: "PATCH", headers: { "content-type": "application/json", "If-Match": `\"${hook.version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ enabled: !hook.enabled }) });
      const body = await response.json().catch(() => null);
      if (response.ok) { setHooks((current) => current.map((item) => item.id === hook.id ? { ...item, ...body.data } : item)); setNotice(en ? "Webhook updated." : "Webhook 状态已更新。"); }
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
      if (response.ok) { setSecret(body.data.secret); setNotice(en ? "Signing secret rotated." : "签名 Secret 已轮换。"); }
      else setError(body?.error?.message ?? (en ? "Secret rotation failed." : "Secret 轮换失败，请重试。"));
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusyAction(""); }
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return <><main className="page-shell min-h-screen"><header className="page-header"><div className="page-kicker"><RadioTower size={13} />Agent handoff</div><h1 className="page-title">{en ? "Automation" : "自动化设置"}</h1><p className="page-description">{en ? "Connect coding agents securely and send optional issue.created notifications." : "安全地连接 Coding Agent，并按需推送 issue.created 事件。"}</p></header>
    {error && <p role="alert" className="mb-5 rounded-xl border border-[#e2bfc0] bg-[#f8eaea] px-4 py-3 text-xs text-[#963a3a]">{error}</p>}{notice && <p role="status" className="mb-5 rounded-xl border border-[#bed8c8] bg-[#edf7f1] px-4 py-3 text-xs text-[#356347]">{notice}</p>}<div className="grid gap-6 xl:grid-cols-2"><section><div className="mb-3 flex items-center gap-2 text-[#344c5a]"><span className="grid size-8 place-items-center rounded-xl bg-[#e7edf2]"><KeyRound size={16} /></span><h2 className="font-bold">API Tokens</h2></div><Card className="p-5 sm:p-6"><form onSubmit={createToken} className="flex flex-col gap-2 sm:flex-row"><Input value={tokenName} onChange={(e) => { setTokenName(e.target.value); setError(""); }} placeholder={en ? "Agent on checkout repo" : "例如：商城仓库 Agent"} required /><Button disabled={busyAction === "token:create"}>{busyAction === "token:create" ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}{en ? "Create" : "创建"}</Button></form>{newToken && <div className="mt-4 rounded-2xl border border-[#c6d3dc] bg-[#edf3f6] p-4"><div className="text-xs font-bold text-[#405f70]">{en ? "Copy now. It will not be shown again." : "请立即复制，此 Token 不会再次显示。"}</div><button onClick={() => void copy(newToken)} className="focus-ring mt-2 flex min-h-11 w-full items-center justify-between gap-2 overflow-hidden rounded-xl bg-[#202a33] p-3 text-left font-mono text-[10px] text-white!"><span className="truncate">{newToken}</span>{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>}<div className="mt-5 space-y-2">{tokens.map((token) => <div key={token.id} className="flex items-center justify-between rounded-xl border border-[#d8dee4] bg-[#f1f4f6] p-3.5"><div><div className="text-sm font-bold">{token.name}</div><div className="mt-1 font-mono text-[9px] text-[#7d8790]">{token.prefix}•••• · {token.scopes.join(", ")}</div></div><button aria-label={en ? "Revoke token" : "撤销 Token"} disabled={Boolean(busyAction)} className="focus-ring icon-button text-[#919aa2] hover:bg-[#f5e8e8] hover:text-[#a93e3e] disabled:opacity-45" onClick={() => { setConfirmError(""); setConfirmation({ title: en ? "Revoke this token?" : "撤销这个 Token？", description: en ? `${token.name} will immediately lose API access.` : `「${token.name}」会立即失去 API 访问权限。`, action: () => revokeToken(token.id) }); }}><Trash2 size={15} /></button></div>)}{!tokens.length && <div className="soft-empty p-5 text-center text-xs">{en ? "No active tokens." : "暂无有效 Token。"}</div>}</div></Card></section>
    <section><div className="mb-3 flex items-center gap-2 text-[#344c5a]"><span className="grid size-8 place-items-center rounded-xl bg-[#e7edf2]"><RadioTower size={16} /></span><h2 className="font-bold">Webhooks</h2></div><Card className="p-5 sm:p-6"><form onSubmit={createHook} className="space-y-3"><Input value={hookName} onChange={(e) => { setHookName(e.target.value); setError(""); }} placeholder={en ? "Webhook name" : "Webhook 名称"} required /><Input value={hookUrl} onChange={(e) => { setHookUrl(e.target.value); setError(""); }} placeholder="https://agent.example.com/pinhere" type="url" required /><select className="focus-ring h-11 w-full rounded-xl border border-[#cbd3da] bg-white px-3.5 text-base outline-none focus:border-[#607989] sm:text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">{en ? "All projects" : "全部项目"}</option>{initial.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><Button className="w-full" disabled={busyAction === "hook:create"}>{busyAction === "hook:create" ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}{en ? "Create webhook" : "创建 Webhook"}</Button></form>{secret && <div className="mt-4 rounded-2xl border border-[#c6d3dc] bg-[#edf3f6] p-4"><div className="text-xs font-bold text-[#405f70]">{en ? "Signing secret — shown once" : "签名 Secret，仅显示一次"}</div><button onClick={() => void copy(secret)} className="focus-ring mt-2 flex min-h-11 w-full items-center justify-between gap-2 overflow-hidden rounded-xl bg-[#202a33] p-3 text-left font-mono text-[10px] text-white!"><span className="truncate">{secret}</span><Copy size={14} /></button></div>}<div className="mt-5 space-y-2">{hooks.map((hook) => { const toggleKey = `hook:${hook.id}:toggle`; const testKey = `hook:${hook.id}:test`; const rotateKey = `hook:${hook.id}:rotate`; return <div key={hook.id} className="rounded-xl border border-[#d8dee4] bg-[#f1f4f6] p-3.5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold">{hook.name}<span className={`size-2 rounded-full ${hook.enabled ? "bg-[#4f7478]" : "bg-[#aaa]"}`} /></div><div className="mt-1 truncate font-mono text-[9px] text-[#7d8790]">{hook.url}</div></div><button aria-label={en ? "Remove webhook" : "删除 Webhook"} disabled={Boolean(busyAction)} className="focus-ring icon-button text-[#919aa2] hover:bg-[#f5e8e8] hover:text-[#a93e3e] disabled:opacity-45" onClick={() => { setConfirmError(""); setConfirmation({ title: en ? "Remove this webhook?" : "删除这个 Webhook？", description: en ? `${hook.name} will stop receiving issue events.` : `「${hook.name}」将不再接收缺陷事件。`, action: () => removeHook(hook) }); }}><Trash2 size={15} /></button></div><div className="mt-3 flex flex-wrap gap-2 border-t border-[#dbe1e6] pt-3"><Button size="sm" variant="outline" disabled={Boolean(busyAction)} onClick={() => void toggleHook(hook)}>{busyAction === toggleKey ? "…" : hook.enabled ? (en ? "Disable" : "停用") : (en ? "Enable" : "启用")}</Button><Button size="sm" variant="outline" disabled={Boolean(busyAction)} onClick={() => void testHook(hook)}>{busyAction === testKey ? <LoaderCircle className="animate-spin" size={13} /> : <Send size={13} />}{en ? "Test" : "测试"}</Button><Button size="sm" variant="ghost" disabled={Boolean(busyAction)} onClick={() => void rotateHook(hook)}>{busyAction === rotateKey ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />}{en ? "Rotate secret" : "轮换 Secret"}</Button></div></div>; })}{!hooks.length && <div className="soft-empty p-5 text-center text-xs">{en ? "No webhooks configured." : "暂无 Webhook。"}</div>}</div></Card></section></div>
    <section className="mt-6"><div className="mb-3 flex items-center gap-2 text-[#344c5a]"><span className="grid size-8 place-items-center rounded-xl bg-[#e7edf2]"><Bot size={16} /></span><h2 className="font-bold">{en ? "Paired agents" : "已配对 Agent"}</h2></div><Card className="p-5 sm:p-6"><div className="grid gap-3 md:grid-cols-2">{initial.agents.map((agent) => { const online = agent.lastSeenAt && Date.now() - new Date(agent.lastSeenAt).getTime() < 90_000; return <div key={agent.id} className="rounded-xl border border-[#d8dee4] bg-[#f1f4f6] p-4"><div className="flex items-center justify-between gap-3"><div className="font-bold">{agent.name}</div><span className={`rounded-full px-2 py-1 font-mono text-[9px] uppercase ${online ? "bg-[#dff4e8] text-[#1d7a52]" : "bg-[#e5e8ea] text-[#747f88]"}`}>{online ? (en ? "online" : "在线") : (en ? "offline" : "离线")}</span></div><div className="mt-2 font-mono text-[9px] text-[#747f88]">{agent.harness} · {agent.platform}{agent.version ? ` · v${agent.version}` : ""}</div><div className="mt-2 text-xs text-[#687680]">{agent.lastSeenAt ? `${en ? "Last seen" : "最后心跳"}: ${new Date(agent.lastSeenAt).toLocaleString()}` : (en ? "Waiting for first heartbeat" : "等待首次心跳")}</div></div>; })}{!initial.agents.length && <div className="soft-empty p-5 text-center text-xs md:col-span-2">{en ? "No paired agents. Run pinhere auth login in a terminal." : "暂无已配对 Agent。请在终端运行 pinhere auth login。"}</div>}</div></Card></section></main>
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? ""} description={confirmation?.description ?? ""} confirmLabel={en ? "Confirm" : "确认"} cancelLabel={en ? "Cancel" : "取消"} busy={busyAction === "confirm"} error={confirmError} onClose={() => { if (busyAction !== "confirm") setConfirmation(null); }} onConfirm={() => { if (confirmation) void confirmation.action(); }} />
  </>;
}
