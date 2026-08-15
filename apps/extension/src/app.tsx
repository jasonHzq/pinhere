import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clipboard, Crosshair, ExternalLink, LoaderCircle, LogOut, MousePointer2, RotateCcw, ShieldCheck } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Cropper } from "@/components/cropper";
import { apiFetch, BASE_URL, login, logout, readTokens } from "@/lib/auth";
import { clearPendingCapture, readPendingCapture } from "@/lib/capture";
import { annotateScreenshot, cropAndCompress } from "@/lib/image";
import type { Capture, Project, Rect } from "@/types";

type Phase = "loading" | "signed_out" | "ready" | "captured" | "submitting" | "success";

function Logo() { return <div className="flex items-center gap-2 font-extrabold tracking-[-.02em]"><img className="size-8" src="/icons/pinhere.svg" alt="" /><span>PINHERE</span></div>; }
function repairPrompt(issueId: string) { return `请使用 Pinhere Skill 处理缺陷 ${issueId}。\n\n先调用 claimIssue 原子领取缺陷，再通过 getIssue 获取页面、DOM、截图、缺陷描述和修复目标。在当前代码仓库完成修复并验证。成功后调用 completeIssue 写回完成状态和摘要；无法完成时调用 releaseIssue 并说明原因。`; }

export function App() {
  const [phase, setPhase] = useState<Phase>("loading"); const [capture, setCapture] = useState<Capture | null>(null); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState(""); const [issueId, setIssueId] = useState(""); const [copied, setCopied] = useState(false);

  async function resumePendingCapture() {
    const pending = await readPendingCapture();
    if (!pending) return false;
    const projectResponse = await apiFetch(`/api/v1/projects/resolve?url=${encodeURIComponent(pending.pageUrl)}`);
    const projectBody = await projectResponse.json();
    if (!projectResponse.ok) throw new Error(projectBody.error?.message ?? "项目匹配失败");
    const project = projectBody.data.project as Project | null;
    if (!project) {
      const origin = new URL(pending.pageUrl).origin;
      await chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/projects?origin=${encodeURIComponent(origin)}` });
      throw new Error(`尚未为 ${origin} 配置项目，已打开新建项目页面`);
    }
    const annotated = await annotateScreenshot(pending.screenshot, pending.dom);
    setCapture({ pageUrl: pending.pageUrl, dom: pending.dom, project, screenshot: annotated.screenshot, crop: annotated.crop });
    await clearPendingCapture();
    return true;
  }

  useEffect(() => {
    void (async () => {
      try {
        const tokens = await readTokens();
        if (!tokens) { setPhase("signed_out"); return; }
        setPhase((await resumePendingCapture()) ? "captured" : "ready");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "无法恢复已圈选的问题");
        setPhase("ready");
      }
    })();
  }, []);

  async function authorize() {
    setError("");
    try {
      await login();
      setPhase((await resumePendingCapture()) ? "captured" : "ready");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "登录失败"); }
  }
  async function startCapture() {
    setError("");
    try {
      const response = await chrome.runtime.sendMessage({ type: "pinhere/start-dom-picker" }) as { ok?: boolean; message?: string };
      if (!response?.ok) throw new Error(response?.message ?? "无法开启圈选");
      window.close();
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
  async function signOut() { await logout(); await clearPendingCapture(); setCapture(null); setPhase("signed_out"); }
  const reset = () => { setCapture(null); setTitle(""); setDescription(""); setIssueId(""); setPhase("ready"); setError(""); };

  return <main className="pinhere-popup min-h-[560px] bg-[#f4f6fa]"><header className="flex items-center justify-between border-b border-[#d8dce5] bg-[#f9fafc]/92 px-5 py-3.5 backdrop-blur"><Logo />{phase !== "signed_out" && phase !== "loading" && <button title="退出登录" className="focus-ring rounded-lg p-2 text-[#777a73] hover:bg-[#164dd80a]" onClick={() => void signOut()}><LogOut size={16} /></button>}</header><div className="p-5">
    {phase === "loading" && <div className="grid min-h-[460px] place-items-center"><LoaderCircle className="animate-spin text-[#164dd8]" /></div>}
    {phase === "signed_out" && <section className="rise pt-6"><div className="mb-7 grid size-14 place-items-center rounded-[16px] border border-[#cbd5ec] bg-[#eaf0ff] shadow-[inset_0_1px_0_rgba(255,255,255,.85)]"><ShieldCheck size={25} className="text-[#164dd8]" /></div><div className="font-mono text-[10px] uppercase tracking-[.17em] text-[#164dd8]">PINHERE ACCESS</div><h1 className="mt-3 text-[34px] font-extrabold leading-[.98] tracking-[-.06em]">圈出问题，<br />交给 Agent。</h1><p className="mt-5 text-sm leading-6 text-[#697080]">登录后，扩展只会获得读取项目、创建缺陷和上传截图的权限。</p><Card className="mt-6 flex gap-3 p-3.5 text-xs leading-5 text-[#596170]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#164dd8] font-mono text-[10px] text-white">1</span><span>授权在 Pinhere 中完成，扩展不会读取你的网页账号或 Console 内容。</span></Card><Button className="mt-5 w-full" onClick={() => void authorize()}>授权并登录 <ExternalLink size={15} /></Button></section>}
    {phase === "ready" && <section className="rise pt-4"><div className="mb-6 rounded-[18px] border border-[#24314d] bg-[#172033] p-5 text-white shadow-[0_16px_42px_rgba(20,34,64,.22)]"><div className="mb-10 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-white/45">DOM CAPTURE / READY</span><span className="size-2 animate-pulse rounded-full bg-[#80a0ff]" /></div><MousePointer2 size={27} className="mb-4 text-[#9bb3ff]" /><h1 className="text-[27px] font-extrabold tracking-[-.05em]">选择页面上的问题</h1><p className="mt-3 text-sm leading-6 text-white/58">点击后面板会收起。选择元素后，再点工具栏图标继续填写。</p></div><Button className="w-full" onClick={() => void startCapture()}><Crosshair size={17} />圈选页面问题</Button><div className="mt-4 text-center font-mono text-[9px] leading-4 text-[#858c9b]">不支持 Chrome 内部页、iframe 与关闭的 Shadow DOM</div></section>}
    {(phase === "captured" || phase === "submitting") && capture && <form onSubmit={submit} className="rise space-y-5"><section><div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold">截图裁剪</span><span className="font-mono text-[9px] text-[#8a8d86]">拖动重新框选</span></div><Cropper src={capture.screenshot} crop={capture.crop} onChange={(crop: Rect) => setCapture({ ...capture, crop })} /></section><Card className="p-4"><div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#8a8d86]">Resolved project</div><div className="mt-1 text-sm font-extrabold">{capture.project.name}</div><div className="mt-2 truncate font-mono text-[9px] text-[#777a73]">{capture.pageUrl}</div></Card><label className="block text-xs font-extrabold">缺陷标题<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：结算按钮点击后没有响应" maxLength={200} required /></label><label className="block text-xs font-extrabold">描述与修复目标<Textarea className="mt-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明当前表现、预期行为，以及完成修复的判断标准。" maxLength={20000} required /></label><div className="grid grid-cols-[auto_1fr] gap-2"><Button type="button" variant="outline" onClick={reset}><RotateCcw size={16} /></Button><Button disabled={phase === "submitting"}>{phase === "submitting" ? <><LoaderCircle size={16} className="animate-spin" />正在提交</> : "创建缺陷"}</Button></div></form>}
    {phase === "success" && <section className="rise pt-8"><div className="mb-7 grid size-16 place-items-center rounded-full bg-[#dff4e8] text-[#1d7a52]"><Check size={30} strokeWidth={2.5} /></div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-[#1d7a52]">Issue created</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">缺陷已进入看板</h1><div className="mt-4 rounded-lg bg-[#ebe9e2] p-3 font-mono text-xs">{issueId}</div><div className="mt-7 space-y-2"><Button className="w-full" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "已复制" : "复制修复 Prompt"}</Button><Button className="w-full" variant="outline" onClick={() => void chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/issues/${issueId}` })}>查看缺陷详情 <ExternalLink size={15} /></Button><Button className="w-full" variant="ghost" onClick={reset}>继续圈选</Button></div></section>}
    {error && <div className="mt-5 flex items-start gap-2 rounded-[11px] border border-[#bb2d3b33] bg-[#fff0f0] p-3 text-xs leading-5 text-[#a32936]"><AlertTriangle className="mt-0.5 shrink-0" size={15} />{error}</div>}
  </div></main>;
}
