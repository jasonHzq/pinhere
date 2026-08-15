import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clipboard, Crosshair, ExternalLink, LoaderCircle, LogOut, MousePointer2, RotateCcw, ShieldCheck } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Cropper } from "@/components/cropper";
import { apiFetch, BASE_URL, login, logout, readTokens } from "@/lib/auth";
import { annotateScreenshot, cropAndCompress } from "@/lib/image";
import { selectDomElement } from "@/lib/picker";
import { sanitizeUrl } from "@/lib/url";
import type { Capture, Project, Rect } from "@/types";

type Phase = "loading" | "signed_out" | "ready" | "captured" | "submitting" | "success";

function Logo() { return <div className="flex items-center gap-2 font-extrabold tracking-[-.02em]"><span className="grid size-8 place-items-center rounded-[9px] bg-[#171916] text-white shadow-[3px_3px_0_#164dd8]"><Crosshair size={17} /></span>PINHERE</div>; }
function repairPrompt(issueId: string) { return `请使用 Pinhere Skill 处理缺陷 ${issueId}。\n\n先调用 claimIssue 原子领取缺陷，再通过 getIssue 获取页面、DOM、截图、缺陷描述和修复目标。在当前代码仓库完成修复并验证。成功后调用 completeIssue 写回完成状态和摘要；无法完成时调用 releaseIssue 并说明原因。`; }

export function App() {
  const [phase, setPhase] = useState<Phase>("loading"); const [capture, setCapture] = useState<Capture | null>(null); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState(""); const [issueId, setIssueId] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => { readTokens().then((value) => setPhase(value ? "ready" : "signed_out")); }, []);
  async function authorize() { setError(""); try { await login(); setPhase("ready"); } catch (reason) { setError(reason instanceof Error ? reason.message : "登录失败"); } }
  async function startCapture() {
    setError(""); try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) throw new Error("当前页面不支持脚本注入，请打开普通 HTTP/HTTPS 网页");
      const pageUrl = sanitizeUrl(tab.url);
      const projectResponse = await apiFetch(`/api/v1/projects/resolve?url=${encodeURIComponent(pageUrl)}`); const projectBody = await projectResponse.json();
      if (!projectResponse.ok) throw new Error(projectBody.error?.message ?? "项目匹配失败");
      const project = projectBody.data.project as Project | null;
      if (!project) { const origin = new URL(pageUrl).origin; await chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/projects?origin=${encodeURIComponent(origin)}` }); throw new Error(`尚未为 ${origin} 配置项目，已打开新建项目页面`); }
      const dom = await selectDomElement(tab.id);
      const raw = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      const annotated = await annotateScreenshot(raw, dom);
      setCapture({ pageUrl, dom, project, screenshot: annotated.screenshot, crop: annotated.crop }); setPhase("captured");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "圈选失败"); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!capture) return; setPhase("submitting"); setError("");
    try {
      const image = await cropAndCompress(capture.screenshot, capture.crop);
      const upload = await apiFetch("/api/v1/attachments", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ fileName: `pinhere-${Date.now()}.webp`, contentType: "image/webp", base64: image }) });
      const uploadBody = await upload.json(); if (!upload.ok) throw new Error(uploadBody.error?.message ?? "截图上传失败");
      const response = await apiFetch("/api/v1/issues", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ projectId: capture.project.id, title, description, pageUrl: capture.pageUrl, dom: capture.dom, attachmentId: uploadBody.data.id, source: "extension" }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "缺陷提交失败");
      setIssueId(body.data.id); setPhase("success");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "提交失败"); setPhase("captured"); }
  }
  async function copy() { await navigator.clipboard.writeText(repairPrompt(issueId)); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  async function signOut() { await logout(); setCapture(null); setPhase("signed_out"); }
  const reset = () => { setCapture(null); setTitle(""); setDescription(""); setIssueId(""); setPhase("ready"); setError(""); };

  return <main className="min-h-screen bg-[#f4f3ef]"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d6d5ce] bg-[#f4f3ef]/95 px-4 py-4 backdrop-blur"><Logo />{phase !== "signed_out" && phase !== "loading" && <button title="退出登录" className="focus-ring rounded-lg p-2 text-[#777a73] hover:bg-black/5" onClick={() => void signOut()}><LogOut size={16} /></button>}</header><div className="p-4">
    {phase === "loading" && <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin text-[#164dd8]" /></div>}
    {phase === "signed_out" && <section className="rise pt-10"><div className="mb-9 grid size-16 place-items-center rounded-[18px] border border-[#c9c8c1] bg-[#ebe9e2]"><ShieldCheck size={28} className="text-[#164dd8]" /></div><div className="font-mono text-[10px] uppercase tracking-[.17em] text-[#164dd8]">Personal workspace</div><h1 className="mt-3 text-4xl font-extrabold leading-[.98] tracking-[-.06em]">圈出问题，<br />交给 Agent。</h1><p className="mt-5 text-sm leading-6 text-[#696d67]">登录后，扩展只会获得读取项目、创建缺陷和上传截图的权限。</p><Button className="mt-8 w-full" onClick={() => void authorize()}>授权并登录 <ExternalLink size={15} /></Button></section>}
    {phase === "ready" && <section className="rise pt-8"><div className="mb-8 rounded-[18px] border border-[#c5c4bd] bg-[#171916] p-6 text-white shadow-[0_20px_55px_rgba(20,22,18,.18)]"><div className="mb-14 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-white/45">DOM CAPTURE / READY</span><span className="size-2 animate-pulse rounded-full bg-[#4f7fff]" /></div><MousePointer2 size={28} className="mb-5 text-[#7599ff]" /><h1 className="text-3xl font-extrabold tracking-[-.05em]">选择页面上的问题</h1><p className="mt-3 text-sm leading-6 text-white/55">点击后切回网页，悬停定位元素，再单击确认。</p></div><Button className="w-full" onClick={() => void startCapture()}><Crosshair size={17} />圈选页面问题</Button><div className="mt-4 text-center font-mono text-[9px] text-[#8a8d86]">不支持 Chrome 内部页、iframe 与关闭的 Shadow DOM</div></section>}
    {(phase === "captured" || phase === "submitting") && capture && <form onSubmit={submit} className="rise space-y-5"><section><div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold">截图裁剪</span><span className="font-mono text-[9px] text-[#8a8d86]">拖动重新框选</span></div><Cropper src={capture.screenshot} crop={capture.crop} onChange={(crop: Rect) => setCapture({ ...capture, crop })} /></section><Card className="p-4"><div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#8a8d86]">Resolved project</div><div className="mt-1 text-sm font-extrabold">{capture.project.name}</div><div className="mt-2 truncate font-mono text-[9px] text-[#777a73]">{capture.pageUrl}</div></Card><label className="block text-xs font-extrabold">缺陷标题<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：结算按钮点击后没有响应" maxLength={200} required /></label><label className="block text-xs font-extrabold">描述与修复目标<Textarea className="mt-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明当前表现、预期行为，以及完成修复的判断标准。" maxLength={20000} required /></label><div className="grid grid-cols-[auto_1fr] gap-2"><Button type="button" variant="outline" onClick={reset}><RotateCcw size={16} /></Button><Button disabled={phase === "submitting"}>{phase === "submitting" ? <><LoaderCircle size={16} className="animate-spin" />正在提交</> : "创建缺陷"}</Button></div></form>}
    {phase === "success" && <section className="rise pt-8"><div className="mb-7 grid size-16 place-items-center rounded-full bg-[#dff4e8] text-[#1d7a52]"><Check size={30} strokeWidth={2.5} /></div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-[#1d7a52]">Issue created</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">缺陷已进入看板</h1><div className="mt-4 rounded-lg bg-[#ebe9e2] p-3 font-mono text-xs">{issueId}</div><div className="mt-7 space-y-2"><Button className="w-full" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "已复制" : "复制修复 Prompt"}</Button><Button className="w-full" variant="outline" onClick={() => void chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/issues/${issueId}` })}>查看缺陷详情 <ExternalLink size={15} /></Button><Button className="w-full" variant="ghost" onClick={reset}>继续圈选</Button></div></section>}
    {error && <div className="mt-5 flex items-start gap-2 rounded-[11px] border border-[#bb2d3b33] bg-[#fff0f0] p-3 text-xs leading-5 text-[#a32936]"><AlertTriangle className="mt-0.5 shrink-0" size={15} />{error}</div>}
  </div></main>;
}
