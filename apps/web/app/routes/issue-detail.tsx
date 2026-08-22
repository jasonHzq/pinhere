import { and, asc, eq } from "drizzle-orm";
import { Check, Clipboard, ExternalLink, LoaderCircle, Pencil, RotateCcw, ScanLine, Trash2, Unlock } from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/issue-detail";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ConfirmDialog, Dialog } from "~/components/ui/dialog";
import { Input, Textarea } from "~/components/ui/input";
import { getDatabase } from "~/db/client.server";
import { agentRuns, issueEvents, issues, projects } from "~/db/schema";
import { getPrincipal } from "~/lib/principal.server";
import { repairPrompt } from "~/lib/repair-prompt";

export async function loader({ request, params }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [row] = await db.select({ issue: issues, project: projects }).from(issues).innerJoin(projects, eq(issues.projectId, projects.id)).where(and(eq(issues.id, params.issueId), eq(issues.userId, principal.userId))).limit(1);
  if (!row) throw new Response("Not found", { status: 404 });
  const [events, runs] = await Promise.all([
    db.select().from(issueEvents).where(eq(issueEvents.issueId, row.issue.id)).orderBy(asc(issueEvents.createdAt)),
    db.select().from(agentRuns).where(eq(agentRuns.issueId, row.issue.id)).orderBy(asc(agentRuns.createdAt))
  ]);
  return { ...row, events, runs, handoffPrompt: repairPrompt(row.issue.id), screenshotUrl: row.issue.attachmentId ? `/api/v1/attachments/${row.issue.attachmentId}` : null };
}

export default function IssueDetail() {
  const initial = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const navigate = useNavigate();
  const [issue, setIssue] = useState(initial.issue);
  const [events, setEvents] = useState(initial.events);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editDescription, setEditDescription] = useState(issue.description);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function refreshEvents() {
    try {
      const response = await fetch(`/api/v1/issues/${issue.id}/events`);
      if (response.ok) setEvents((await response.json()).data);
    } catch { /* The primary action has already succeeded; the next refresh will recover history. */ }
  }

  async function transition(action: "claim" | "complete" | "reopen" | "release", summary?: string) {
    if (actionBusy) return;
    setActionError(""); setDialogError("");
    let body: string | undefined;
    if (action === "complete") {
      if (!summary?.trim()) return;
      body = JSON.stringify({ summary });
    } else if (action === "release") {
      body = JSON.stringify({ reason: en ? "Released manually from the website" : "网站账号人工释放" });
    }
    setActionBusy(action);
    try {
      const response = await fetch(`/api/v1/issues/${issue.id}/${action}`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: body ?? "{}" });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setIssue(payload.data);
        setCompleteOpen(false);
        setCompletionSummary("");
        await refreshEvents();
      } else {
        const message = payload?.error?.message ?? (en ? "Status update failed." : "状态更新失败。");
        if (action === "complete") setDialogError(message); else setActionError(message);
      }
    } catch {
      const message = en ? "Network error. Try again." : "网络异常，请重试。";
      if (action === "complete") setDialogError(message); else setActionError(message);
    } finally { setActionBusy(null); }
  }

  async function editIssue(event: React.FormEvent) {
    event.preventDefault();
    const nextTitle = editTitle.trim();
    const nextDescription = editDescription.trim();
    if (!nextTitle || !nextDescription) return;
    if (actionBusy) return;
    setActionBusy("edit"); setDialogError("");
    try {
      const response = await fetch(`/api/v1/issues/${issue.id}`, { method: "PATCH", headers: { "content-type": "application/json", "If-Match": `\"${issue.version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ title: nextTitle, description: nextDescription }) });
      if (response.ok) { setIssue((await response.json()).data); setEditOpen(false); }
      else { const body = await response.json().catch(() => null); setDialogError(body?.error?.message ?? (en ? "Issue update failed." : "缺陷更新失败，请重试。")); }
    } catch { setDialogError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setActionBusy(null); }
  }

  async function deleteIssue() {
    if (actionBusy) return;
    setActionBusy("delete"); setDeleteError("");
    try {
      const response = await fetch(`/api/v1/issues/${issue.id}`, { method: "DELETE", headers: { "If-Match": `\"${issue.version}\"` } });
      if (response.ok) navigate(`/${locale}/app`);
      else { const body = await response.json().catch(() => null); setDeleteError(body?.error?.message ?? (en ? "Issue deletion failed." : "缺陷删除失败，请重试。")); }
    } catch { setDeleteError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setActionBusy(null); }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(initial.handoffPrompt); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return <><main className="page-shell min-h-screen"><Link to={`/${locale}/app`} className="focus-ring inline-flex min-h-11 items-center rounded-xl px-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#687680] hover:bg-white/70 hover:text-[#171a1d]">← {en ? "Back to board" : "返回看板"}</Link>
    <header className="page-header mt-4 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between"><div className="max-w-3xl"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant={issue.status}>{issue.status}</Badge><span className="font-mono text-[10px] text-[#747f88]">{issue.id}</span></div><h1 className="font-display text-3xl font-bold leading-[1.05] tracking-[-.04em] md:text-5xl">{issue.title}</h1><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#626d76]">{issue.description}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" disabled={Boolean(actionBusy)} onClick={() => { setDialogError(""); setEditTitle(issue.title); setEditDescription(issue.description); setEditOpen(true); }}><Pencil size={15} />{en ? "Edit" : "编辑"}</Button><Button variant="outline" disabled={Boolean(actionBusy)} onClick={() => void copyPrompt()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? (en ? "Copied" : "已复制") : (en ? "Copy repair prompt" : "复制修复 Prompt")}</Button>{issue.status === "open" && <Button disabled={Boolean(actionBusy)} onClick={() => void transition("claim")}>{actionBusy === "claim" ? <LoaderCircle className="animate-spin" size={16} /> : <ScanLine size={16} />}{en ? "Claim" : "人工认领"}</Button>}{issue.status === "in_progress" && <><Button variant="outline" disabled={Boolean(actionBusy)} onClick={() => void transition("release")}>{actionBusy === "release" ? <LoaderCircle className="animate-spin" size={15} /> : <Unlock size={15} />}{en ? "Release" : "释放"}</Button><Button disabled={Boolean(actionBusy)} onClick={() => { setDialogError(""); setCompleteOpen(true); }}><Check size={16} />{en ? "Complete" : "标记完成"}</Button></>}{issue.status === "done" && <Button disabled={Boolean(actionBusy)} onClick={() => void transition("reopen")}>{actionBusy === "reopen" ? <LoaderCircle className="animate-spin" size={16} /> : <RotateCcw size={16} />}{en ? "Reopen" : "重新打开"}</Button>}<Button aria-label={en ? "Delete issue" : "删除缺陷"} variant="danger" size="icon" disabled={Boolean(actionBusy)} onClick={() => { setDeleteError(""); setDeleteOpen(true); }}><Trash2 size={15} /></Button></div>{actionError && <p role="alert" className="rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{actionError}</p>}</header>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><div className="space-y-6">{initial.screenshotUrl && <Card className="overflow-hidden"><div className="border-b border-[#d8dee4] px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-[#687680]">Screenshot</div><div className="bg-[#e9edf1] p-3 sm:p-4"><img src={initial.screenshotUrl} className="mx-auto max-h-[680px] rounded-xl shadow-[0_8px_24px_rgba(35,45,54,.12)]" alt="Issue screenshot" /></div></Card>}<Card className="p-5 sm:p-6"><h2 className="text-sm font-bold">DOM context</h2><dl className="mt-4 grid gap-4 text-xs"><div><dt className="font-mono text-[10px] text-[#7d8790]">CSS SELECTOR</dt><dd className="mt-1 overflow-x-auto rounded-xl bg-[#eef1f4] p-3 font-mono">{issue.dom.cssSelector}</dd></div><div><dt className="font-mono text-[10px] text-[#7d8790]">XPATH</dt><dd className="mt-1 overflow-x-auto rounded-xl bg-[#eef1f4] p-3 font-mono">{issue.dom.xpath}</dd></div><div><dt className="font-mono text-[10px] text-[#7d8790]">OUTER HTML</dt><dd className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-[#202a33] p-4 font-mono text-[11px] leading-5 text-[#eef2f5]">{issue.dom.outerHTML}</dd></div></dl></Card></div>
    <aside className="space-y-5"><Card className="p-5 sm:p-6"><h2 className="text-sm font-bold">{en ? "Source" : "来源信息"}</h2><dl className="mt-4 space-y-4 text-xs"><div><dt className="font-mono text-[10px] text-[#7d8790]">PROJECT</dt><dd className="mt-1 font-bold">{initial.project.name}</dd></div><div><dt className="font-mono text-[10px] text-[#7d8790]">PAGE</dt><dd className="mt-1"><a href={issue.pageUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 break-all text-[#395d70] hover:underline">{issue.pageUrl}<ExternalLink className="mt-0.5 shrink-0" size={12} /></a></dd></div><div><dt className="font-mono text-[10px] text-[#7d8790]">CREATED</dt><dd className="mt-1">{new Date(issue.createdAt).toLocaleString()}</dd></div></dl></Card>{initial.runs.length > 0 && <Card className="p-5 sm:p-6"><h2 className="text-sm font-bold">Agent runs</h2><div className="mt-4 space-y-3">{initial.runs.map((run) => <div key={run.id} className="rounded-xl border border-[#d8dee4] bg-[#f1f4f6] p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase">{run.harness} · {run.status}</span>{run.externalThreadId && <Button size="sm" variant="outline" onClick={() => { window.location.href = `codex://threads/${encodeURIComponent(run.externalThreadId!)}`; }}><ExternalLink size={12} />{en ? "Open" : "在 Codex 打开"}</Button>}</div>{run.error && <p className="mt-2 text-xs text-[#a33f3f]">{run.error}</p>}</div>)}</div></Card>}<Card className="p-5 sm:p-6"><h2 className="text-sm font-bold">{en ? "History" : "状态历史"}</h2><ol className="mt-5 space-y-5 border-l border-[#c7d0d7] pl-5">{events.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[24px] top-1 size-2 rounded-full bg-[#4f7184] ring-4 ring-white" /><div className="text-xs font-bold">{event.type}</div><div className="mt-1 font-mono text-[9px] text-[#7d8790]">{new Date(event.createdAt).toLocaleString()}</div></li>)}</ol></Card></aside></div></main>
    <Dialog open={editOpen} title={en ? "Edit issue" : "编辑缺陷"} description={en ? "Keep the title specific and describe the expected result." : "标题尽量具体，并说明你期望看到的结果。"} onClose={() => { if (actionBusy !== "edit") setEditOpen(false); }}><form onSubmit={editIssue} className="space-y-4"><label className="block text-xs font-semibold">{en ? "Issue title" : "缺陷标题"}<Input className="mt-2" value={editTitle} onChange={(event) => { setEditTitle(event.target.value); setDialogError(""); }} autoFocus required /></label><label className="block text-xs font-semibold">{en ? "Description and target" : "描述与修复目标"}<Textarea className="mt-2" value={editDescription} onChange={(event) => { setEditDescription(event.target.value); setDialogError(""); }} required /></label>{dialogError && <p role="alert" className="rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{dialogError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={actionBusy === "edit"} onClick={() => setEditOpen(false)}>{en ? "Cancel" : "取消"}</Button><Button type="submit" disabled={actionBusy === "edit"}>{actionBusy === "edit" ? "…" : en ? "Save changes" : "保存修改"}</Button></div></form></Dialog>
    <Dialog open={completeOpen} title={en ? "Complete this issue" : "完成这个缺陷"} description={en ? "Leave a concise summary so everyone knows what changed." : "写一段简洁的完成摘要，让所有人都知道改了什么。"} onClose={() => { if (actionBusy !== "complete") setCompleteOpen(false); }}><form onSubmit={(event) => { event.preventDefault(); void transition("complete", completionSummary); }} className="space-y-4"><label className="block text-xs font-semibold">{en ? "Completion summary" : "完成摘要"}<Textarea className="mt-2 min-h-24" value={completionSummary} onChange={(event) => { setCompletionSummary(event.target.value); setDialogError(""); }} autoFocus required /></label>{dialogError && <p role="alert" className="rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{dialogError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={actionBusy === "complete"} onClick={() => setCompleteOpen(false)}>{en ? "Cancel" : "取消"}</Button><Button type="submit" disabled={actionBusy === "complete"}>{actionBusy === "complete" ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}{en ? "Mark complete" : "标记完成"}</Button></div></form></Dialog>
    <ConfirmDialog open={deleteOpen} title={en ? "Delete this issue?" : "删除这个缺陷？"} description={en ? "The issue, its history, and its screenshot will be permanently removed." : "缺陷、状态历史和截图都会被永久删除。"} confirmLabel={en ? "Delete issue" : "确认删除"} cancelLabel={en ? "Cancel" : "取消"} busy={actionBusy === "delete"} error={deleteError} onClose={() => { if (actionBusy !== "delete") setDeleteOpen(false); }} onConfirm={() => void deleteIssue()} />
  </>;
}
