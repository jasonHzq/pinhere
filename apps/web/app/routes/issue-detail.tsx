import { and, eq } from "drizzle-orm";
import { Check, Clipboard, ExternalLink, Pencil, RotateCcw, ScanLine, Trash2, Unlock } from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/issue-detail";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getDatabase } from "~/db/client.server";
import { issueEvents, issues, projects } from "~/db/schema";
import { getPrincipal } from "~/lib/principal.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [row] = await db.select({ issue: issues, project: projects }).from(issues).innerJoin(projects, eq(issues.projectId, projects.id)).where(and(eq(issues.id, params.issueId), eq(issues.userId, principal.userId))).limit(1);
  if (!row) throw new Response("Not found", { status: 404 });
  const events = await db.select().from(issueEvents).where(eq(issueEvents.issueId, row.issue.id));
  return { ...row, events, screenshotUrl: row.issue.attachmentId ? `/api/v1/attachments/${row.issue.attachmentId}` : null };
}

function promptFor(issueId: string) {
  return `请使用 Pinhere Skill 处理缺陷 ${issueId}。\n\n先调用 claimIssue 原子领取缺陷，再通过 getIssue 获取页面、DOM、截图、缺陷描述和修复目标。在当前代码仓库完成修复并验证。成功后调用 completeIssue 写回完成状态和摘要；无法完成时调用 releaseIssue 并说明原因。`;
}

export default function IssueDetail() {
  const initial = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const navigate = useNavigate();
  const [issue, setIssue] = useState(initial.issue);
  const [copied, setCopied] = useState(false);

  async function transition(action: "claim" | "complete" | "reopen" | "release") {
    let body: string | undefined;
    if (action === "complete") {
      const summary = prompt(en ? "Completion summary" : "请输入完成摘要");
      if (!summary) return;
      body = JSON.stringify({ summary });
    } else if (action === "release") {
      body = JSON.stringify({ reason: en ? "Released manually from the website" : "网站账号人工释放" });
    }
    const response = await fetch(`/api/v1/issues/${issue.id}/${action}`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: body ?? "{}" });
    if (response.ok) setIssue((await response.json()).data);
  }

  async function editIssue() {
    const nextTitle = prompt(en ? "Issue title" : "缺陷标题", issue.title)?.trim();
    if (!nextTitle) return;
    const nextDescription = prompt(en ? "Description and target" : "描述与修复目标", issue.description)?.trim();
    if (!nextDescription) return;
    const response = await fetch(`/api/v1/issues/${issue.id}`, { method: "PATCH", headers: { "content-type": "application/json", "If-Match": `\"${issue.version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ title: nextTitle, description: nextDescription }) });
    if (response.ok) setIssue((await response.json()).data);
  }

  async function deleteIssue() {
    if (!confirm(en ? "Delete this issue and screenshot?" : "确认删除该缺陷、历史记录和截图？")) return;
    const response = await fetch(`/api/v1/issues/${issue.id}`, { method: "DELETE", headers: { "If-Match": `\"${issue.version}\"` } });
    if (response.ok) navigate(`/${locale}/app`);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptFor(issue.id)); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return <main className="min-h-screen p-5 md:p-8 xl:p-10"><Link to={`/${locale}/app`} className="font-mono text-[10px] uppercase tracking-[.14em] text-[#696d67] hover:text-[#164dd8]">← {en ? "Back to board" : "返回看板"}</Link>
    <header className="mt-6 flex flex-col gap-5 border-b border-[#d6d5ce] pb-7 md:flex-row md:items-start md:justify-between"><div className="max-w-3xl"><div className="mb-3 flex items-center gap-2"><Badge variant={issue.status}>{issue.status}</Badge><span className="font-mono text-[10px] text-[#777a73]">{issue.id}</span></div><h1 className="text-3xl font-extrabold tracking-[-.05em] md:text-5xl">{issue.title}</h1><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#5f635d]">{issue.description}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={() => void editIssue()}><Pencil size={15} />{en ? "Edit" : "编辑"}</Button><Button variant="outline" onClick={() => void copyPrompt()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? (en ? "Copied" : "已复制") : (en ? "Copy repair prompt" : "复制修复 Prompt")}</Button>{issue.status === "open" && <Button onClick={() => void transition("claim")}><ScanLine size={16} />{en ? "Claim" : "人工认领"}</Button>}{issue.status === "in_progress" && <><Button variant="outline" onClick={() => void transition("release")}><Unlock size={15} />{en ? "Release" : "释放"}</Button><Button onClick={() => void transition("complete")}><Check size={16} />{en ? "Complete" : "标记完成"}</Button></>}{issue.status === "done" && <Button onClick={() => void transition("reopen")}><RotateCcw size={16} />{en ? "Reopen" : "重新打开"}</Button>}<Button variant="danger" onClick={() => void deleteIssue()}><Trash2 size={15} /></Button></div></header>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><div className="space-y-6">{initial.screenshotUrl && <Card className="overflow-hidden"><div className="border-b border-[#d6d5ce] px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-[#696d67]">Screenshot</div><div className="bg-[#deddd7] p-3"><img src={initial.screenshotUrl} className="mx-auto max-h-[680px] rounded-lg shadow-lg" alt="Issue screenshot" /></div></Card>}<Card className="p-5"><h2 className="text-sm font-extrabold">DOM context</h2><dl className="mt-4 grid gap-4 text-xs"><div><dt className="font-mono text-[10px] text-[#8b8e87]">CSS SELECTOR</dt><dd className="mt-1 overflow-x-auto rounded-lg bg-[#ebe9e2] p-3 font-mono">{issue.dom.cssSelector}</dd></div><div><dt className="font-mono text-[10px] text-[#8b8e87]">XPATH</dt><dd className="mt-1 overflow-x-auto rounded-lg bg-[#ebe9e2] p-3 font-mono">{issue.dom.xpath}</dd></div><div><dt className="font-mono text-[10px] text-[#8b8e87]">OUTER HTML</dt><dd className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-[#171916] p-4 font-mono text-[11px] leading-5 text-[#dce3d9]">{issue.dom.outerHTML}</dd></div></dl></Card></div>
    <aside className="space-y-5"><Card className="p-5"><h2 className="text-sm font-extrabold">{en ? "Source" : "来源信息"}</h2><dl className="mt-4 space-y-4 text-xs"><div><dt className="font-mono text-[10px] text-[#8b8e87]">PROJECT</dt><dd className="mt-1 font-bold">{initial.project.name}</dd></div><div><dt className="font-mono text-[10px] text-[#8b8e87]">PAGE</dt><dd className="mt-1"><a href={issue.pageUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 break-all text-[#164dd8] hover:underline">{issue.pageUrl}<ExternalLink className="mt-0.5 shrink-0" size={12} /></a></dd></div><div><dt className="font-mono text-[10px] text-[#8b8e87]">CREATED</dt><dd className="mt-1">{new Date(issue.createdAt).toLocaleString()}</dd></div></dl></Card><Card className="p-5"><h2 className="text-sm font-extrabold">{en ? "History" : "状态历史"}</h2><ol className="mt-5 space-y-5 border-l border-[#c8c7c0] pl-5">{initial.events.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[24px] top-1 size-2 rounded-full bg-[#164dd8] ring-4 ring-[#faf9f5]" /><div className="text-xs font-bold">{event.type}</div><div className="mt-1 font-mono text-[9px] text-[#8b8e87]">{new Date(event.createdAt).toLocaleString()}</div></li>)}</ol></Card></aside></div></main>;
}
