import { and, desc, eq, isNull } from "drizzle-orm";
import { Check, Copy, KeyRound, Plus, RadioTower, RefreshCw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/settings";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { getDatabase } from "~/db/client.server";
import { apiTokens, projects, webhooks } from "~/db/schema";
import { getPrincipal } from "~/lib/principal.server";

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [tokens, hooks, projectRows] = await Promise.all([
    db.select({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, scopes: apiTokens.scopes, lastUsedAt: apiTokens.lastUsedAt, createdAt: apiTokens.createdAt }).from(apiTokens).where(and(eq(apiTokens.userId, principal.userId), isNull(apiTokens.revokedAt))).orderBy(desc(apiTokens.createdAt)),
    db.select({ id: webhooks.id, name: webhooks.name, url: webhooks.url, enabled: webhooks.enabled, projectId: webhooks.projectId, version: webhooks.version }).from(webhooks).where(eq(webhooks.userId, principal.userId)),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.userId, principal.userId))
  ]);
  return { tokens, hooks, projects: projectRows };
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

  async function createToken(event: React.FormEvent) {
    event.preventDefault(); setError(""); const response = await fetch("/api/v1/tokens", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: tokenName }) });
    const body = await response.json(); if (response.ok) { setNewToken(body.data.token); setTokens([{ ...body.data, createdAt: new Date().toISOString(), lastUsedAt: null }, ...tokens]); setTokenName(""); } else setError(body.error?.message ?? "Token creation failed.");
  }
  async function revokeToken(id: string) { const response = await fetch(`/api/v1/tokens/${id}`, { method: "DELETE" }); if (response.ok) setTokens(tokens.filter((token) => token.id !== id)); else setError("Token revocation failed."); }
  async function createHook(event: React.FormEvent) { event.preventDefault(); setError(""); const response = await fetch("/api/v1/webhooks", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: hookName, url: hookUrl, projectId: projectId || undefined }) }); const body = await response.json(); if (response.ok) { setSecret(body.data.secret); setHooks([{ ...body.data, secret: undefined }, ...hooks]); setHookName(""); setHookUrl(""); } else setError(body.error?.message ?? "Webhook creation failed."); }
  async function removeHook(hook: typeof hooks[number]) { const response = await fetch(`/api/v1/webhooks/${hook.id}`, { method: "DELETE", headers: { "If-Match": `\"${hook.version}\"` } }); if (response.ok) setHooks(hooks.filter((item) => item.id !== hook.id)); else setError("Webhook removal failed."); }
  async function toggleHook(hook: typeof hooks[number]) { const response = await fetch(`/api/v1/webhooks/${hook.id}`, { method: "PATCH", headers: { "content-type": "application/json", "If-Match": `\"${hook.version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ enabled: !hook.enabled }) }); if (response.ok) { const body = await response.json(); setHooks(hooks.map((item) => item.id === hook.id ? { ...item, ...body.data } : item)); } }
  async function testHook(hook: typeof hooks[number]) { await fetch(`/api/v1/webhooks/${hook.id}/test`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: "{}" }); }
  async function rotateHook(hook: typeof hooks[number]) { const response = await fetch(`/api/v1/webhooks/${hook.id}/rotate-secret`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: "{}" }); if (response.ok) setSecret((await response.json()).data.secret); }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return <main className="min-h-screen p-5 md:p-8 xl:p-10"><header className="mb-9 border-b border-[#d8d8d2] pb-7"><div className="font-mono text-[10px] uppercase tracking-[.16em] text-[#3d3d39]">Agent handoff</div><h1 className="mt-3 text-4xl font-bold tracking-[-.06em]">{en ? "Automation" : "自动化设置"}</h1><p className="mt-2 text-sm text-[#6c6c67]">{en ? "Create caller-owned credentials and optional issue.created notifications." : "创建由调用方持有的凭证，并按需推送 issue.created 事件。"}</p></header>
    {error && <p role="alert" className="mb-5 border border-[#efc7ca] bg-[#fff3f3] px-3 py-2 text-xs text-[#9f2731]">{error}</p>}<div className="grid gap-6 xl:grid-cols-2"><section><div className="mb-3 flex items-center gap-2"><KeyRound size={17} /><h2 className="font-bold">API Tokens</h2></div><Card className="p-5"><form onSubmit={createToken} className="flex gap-2"><Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder={en ? "Agent on checkout repo" : "例如：商城仓库 Agent"} required /><Button><Plus size={16} />{en ? "Create" : "创建"}</Button></form>{newToken && <div className="mt-4 border border-[#d6b479] bg-[#fff8e8] p-4"><div className="text-xs font-bold text-[#82550a]">{en ? "Copy now. It will not be shown again." : "请立即复制，此 Token 不会再次显示。"}</div><button onClick={() => void copy(newToken)} className="mt-2 flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-[#171717] p-3 text-left font-mono text-[10px] text-white"><span className="truncate">{newToken}</span>{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>}<div className="mt-5 space-y-2">{tokens.map((token) => <div key={token.id} className="flex items-center justify-between rounded-lg border border-[#deded8] bg-[#fafaf8] p-3"><div><div className="text-sm font-bold">{token.name}</div><div className="mt-1 font-mono text-[9px] text-[#8b8e87]">{token.prefix}•••• · {token.scopes.join(", ")}</div></div><button className="focus-ring rounded-md p-2 text-[#999] hover:bg-[#fee8e8] hover:text-[#bb2d3b]" onClick={() => void revokeToken(token.id)}><Trash2 size={15} /></button></div>)}</div></Card></section>
    <section><div className="mb-3 flex items-center gap-2"><RadioTower size={17} /><h2 className="font-bold">Webhooks</h2></div><Card className="p-5"><form onSubmit={createHook} className="space-y-3"><Input value={hookName} onChange={(e) => setHookName(e.target.value)} placeholder={en ? "Webhook name" : "Webhook 名称"} required /><Input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://agent.example.com/pinhere" type="url" required /><select className="focus-ring h-10 w-full rounded-lg border border-[#d0d0ca] bg-white px-3 text-sm focus:border-[#151515]" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">{en ? "All projects" : "全部项目"}</option>{initial.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><Button className="w-full"><Plus size={16} />{en ? "Create webhook" : "创建 Webhook"}</Button></form>{secret && <div className="mt-4 border border-[#d6b479] bg-[#fff8e8] p-4"><div className="text-xs font-bold text-[#82550a]">{en ? "Signing secret — shown once" : "签名 Secret，仅显示一次"}</div><button onClick={() => void copy(secret)} className="mt-2 flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-[#171717] p-3 text-left font-mono text-[10px] text-white"><span className="truncate">{secret}</span><Copy size={14} /></button></div>}<div className="mt-5 space-y-2">{hooks.map((hook) => <div key={hook.id} className="rounded-lg border border-[#deded8] bg-[#fafaf8] p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold">{hook.name}<span className={`size-2 rounded-full ${hook.enabled ? "bg-[#1d7a52]" : "bg-[#aaa]"}`} /></div><div className="mt-1 truncate font-mono text-[9px] text-[#8b8e87]">{hook.url}</div></div><button className="focus-ring rounded-md p-2 text-[#999] hover:bg-[#fee8e8] hover:text-[#bb2d3b]" onClick={() => void removeHook(hook)}><Trash2 size={15} /></button></div><div className="mt-3 flex flex-wrap gap-2 border-t border-[#e5e5e0] pt-3"><Button size="sm" variant="outline" onClick={() => void toggleHook(hook)}>{hook.enabled ? (en ? "Disable" : "停用") : (en ? "Enable" : "启用")}</Button><Button size="sm" variant="outline" onClick={() => void testHook(hook)}><Send size={13} />{en ? "Test" : "测试"}</Button><Button size="sm" variant="ghost" onClick={() => void rotateHook(hook)}><RefreshCw size={13} />{en ? "Rotate secret" : "轮换 Secret"}</Button></div></div>)}</div></Card></section></div></main>;
}
