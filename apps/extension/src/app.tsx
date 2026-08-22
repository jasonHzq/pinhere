import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Crosshair,
  ExternalLink,
  Home,
  ImageIcon,
  LoaderCircle,
  LogOut,
  MousePointer2,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Cropper } from "@/components/cropper";
import {
  apiFetch,
  AUTH_ERROR_KEY,
  AUTH_PENDING_KEY,
  BASE_URL,
  login,
  logout,
  readAuthorizationStatus,
  TOKEN_KEY
} from "@/lib/auth";
import { clearPendingCapture, PENDING_CAPTURE_KEY, readPendingCapture } from "@/lib/capture";
import { annotateScreenshot, cropAndCompress } from "@/lib/image";
import type { Capture, Project, Rect } from "@/types";

type Phase = "loading" | "signed_out" | "ready" | "captured" | "submitting" | "success";

const DESCRIPTION_TEMPLATE = `## 问题是什么


## 修复预期


## 复现方式
1. 打开页面
2.

## 补充说明
`;

function Logo() {
  return (
    <div className="flex items-center gap-2 font-extrabold tracking-[-.035em]">
      <img className="size-7" src="/icons/pinhere.svg" alt="" />
      <span>PINHERE</span>
    </div>
  );
}

export function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [initialCrop, setInitialCrop] = useState<Rect | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [issueId, setIssueId] = useState("");
  const [handoffPrompt, setHandoffPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);

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
    setCapture({
      pageUrl: pending.pageUrl,
      dom: pending.dom,
      project,
      screenshot: annotated.screenshot,
      crop: annotated.crop
    });
    setInitialCrop(annotated.crop);
    setTitle("");
    setDescription(DESCRIPTION_TEMPLATE);
    await clearPendingCapture();
    return true;
  }

  async function restoreAuthorization() {
    try {
      const status = await readAuthorizationStatus();
      setAuthorizing(status.pending);
      if (!status.tokens) {
        setError(status.error);
        setPhase("signed_out");
        return;
      }
      setError("");
      setPhase((await resumePendingCapture()) ? "captured" : "ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法恢复已圈选的问题");
      setPhase("ready");
    }
  }

  useEffect(() => {
    void restoreAuthorization();
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      const authChanged = [TOKEN_KEY, AUTH_PENDING_KEY, AUTH_ERROR_KEY].some((key) => key in changes);
      const captureArrived = Boolean(changes[PENDING_CAPTURE_KEY]?.newValue);
      if (authChanged || captureArrived) void restoreAuthorization();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  async function authorize() {
    if (authorizing) return;
    setAuthorizing(true);
    setError("");
    let waitingForSafari = false;
    try {
      const tokens = await login();
      waitingForSafari = !tokens;
      if (tokens) setPhase((await resumePendingCapture()) ? "captured" : "ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      if (!waitingForSafari) setAuthorizing(false);
    }
  }

  async function startCapture() {
    setError("");
    try {
      const response = await chrome.runtime.sendMessage({ type: "pinhere/start-dom-picker" }) as { ok?: boolean; message?: string };
      if (!response?.ok) throw new Error(response?.message ?? "无法开启圈选");
      window.close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "圈选失败");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!capture) return;
    setPhase("submitting");
    setError("");
    try {
      const image = await cropAndCompress(capture.screenshot, capture.crop);
      const upload = await apiFetch("/api/v1/attachments", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          fileName: `pinhere-${Date.now()}.${image.extension}`,
          contentType: image.contentType,
          base64: image.base64
        })
      });
      const uploadBody = await upload.json();
      if (!upload.ok) throw new Error(uploadBody.error?.message ?? "截图上传失败");

      const response = await apiFetch("/api/v1/issues", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          projectId: capture.project.id,
          title: title.trim(),
          description: description.trim(),
          pageUrl: capture.pageUrl,
          dom: capture.dom,
          attachmentId: uploadBody.data.id,
          source: "extension"
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "缺陷提交失败");
      setIssueId(body.data.id);
      setHandoffPrompt(body.data.handoffPrompt);
      setPhase("success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败");
      setPhase("captured");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(handoffPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function signOut() {
    await logout();
    await clearPendingCapture();
    setCapture(null);
    setPhase("signed_out");
  }

  const reset = () => {
    setCapture(null);
    setInitialCrop(null);
    setTitle("");
    setDescription("");
    setIssueId("");
    setHandoffPrompt("");
    setPhase("ready");
    setError("");
  };

  return (
    <main className="pinhere-popup">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e4e8ee] bg-[#fffdfa]/95 px-4 py-3 backdrop-blur-xl">
        <Logo />
        {phase !== "signed_out" && phase !== "loading" && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="打开 Pinhere 工作台"
              aria-label="打开 Pinhere 工作台"
              className="focus-ring rounded-lg p-2 text-[#697386] transition-colors hover:bg-[#eef2f7] hover:text-[#172033]"
              onClick={() => void chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app` })}
            >
              <Home size={17} />
            </button>
            <button
              type="button"
              title="退出登录"
              aria-label="退出登录"
              className="focus-ring rounded-lg p-2 text-[#697386] transition-colors hover:bg-[#eef2f7] hover:text-[#172033]"
              onClick={() => void signOut()}
            >
              <LogOut size={17} />
            </button>
          </div>
        )}
      </header>

      <div className="p-4">
        {phase === "loading" && (
          <div className="grid min-h-[240px] place-items-center">
            <LoaderCircle className="animate-spin text-[#315efb]" />
          </div>
        )}

        {phase === "signed_out" && (
          <section className="rise py-2">
            <div className="eyebrow">Extension access</div>
            <h1 className="mt-2 text-[24px] font-extrabold leading-[1.05] tracking-[-.045em]">连接，然后圈选</h1>
            <p className="mt-3 text-[13px] leading-6 text-[#697386]">读取匹配项目、捕获页面上下文，并在侧边抽屉中整理缺陷。</p>
            <div className="mt-5 rounded-2xl border border-[#dfe5ec] bg-white p-4 text-xs leading-5 text-[#697386] shadow-[0_12px_32px_rgba(35,48,68,.06)]">
              授权在 Pinhere 完成，仅首次使用时需要。
            </div>
            <Button className="mt-4 w-full" disabled={authorizing} onClick={() => void authorize()}>
              {authorizing ? <><LoaderCircle className="animate-spin" size={15} />正在完成授权…</> : <>授权并登录 <ExternalLink size={15} /></>}
            </Button>
          </section>
        )}

        {phase === "ready" && (
          <section className="rise">
            <div className="capture-intro">
              <div className="flex items-center justify-between">
                <span className="eyebrow">DOM capture · ready</span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#43735c]"><span className="size-1.5 animate-pulse rounded-full bg-[#4d9a72]" />已就绪</span>
              </div>
              <div className="mt-5 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#edf2ff] text-[#315efb]"><MousePointer2 size={20} /></span>
                <div>
                  <h1 className="text-[22px] font-extrabold leading-tight tracking-[-.045em]">选择页面上的问题</h1>
                  <p className="mt-2 text-[12px] leading-5 text-[#697386]">选中元素后会自动打开编辑抽屉，截图、标题和描述都可以再调整。</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#e6eaf0] pt-4 text-center text-[10px] font-semibold text-[#7a8494]">
                <span>① 圈选</span><span>② 编辑</span><span>③ 提交</span>
              </div>
            </div>
            <Button className="mt-3 w-full" onClick={() => void startCapture()}><Crosshair size={16} />圈选页面问题</Button>
            <p className="mt-3 text-center text-[10px] leading-4 text-[#8b94a2]">不支持浏览器内部页、iframe 与关闭的 Shadow DOM</p>
          </section>
        )}

        {(phase === "captured" || phase === "submitting") && capture && (
          <form onSubmit={submit} className="rise space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#e2e7ed] pb-4">
              <div>
                <div className="eyebrow">New issue</div>
                <h1 className="mt-1 text-xl font-extrabold tracking-[-.035em]">整理这条缺陷</h1>
              </div>
              <span className="rounded-full bg-[#eaf7ef] px-2.5 py-1 text-[10px] font-bold text-[#357254]">已捕获</span>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold"><ImageIcon size={14} className="text-[#315efb]" />截图编辑</div>
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-[#697386] hover:bg-[#edf1f5]"
                  onClick={() => initialCrop && setCapture({ ...capture, crop: initialCrop })}
                >
                  <RotateCcw size={11} />恢复选区
                </button>
              </div>
              <Cropper src={capture.screenshot} crop={capture.crop} onChange={(crop) => setCapture({ ...capture, crop })} />
              <p className="mt-2 text-[10px] leading-4 text-[#7d8795]">在图片上拖动即可重新框选，提交时只会上传当前选区。</p>
            </section>

            <Card className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="eyebrow">Matched project</div>
                  <div className="mt-1 truncate text-sm font-extrabold">{capture.project.name}</div>
                </div>
                <Sparkles size={16} className="shrink-0 text-[#315efb]" />
              </div>
              <div className="mt-2 truncate font-mono text-[9px] text-[#7d8795]">{capture.pageUrl}</div>
            </Card>

            <label className="block text-xs font-extrabold">
              缺陷标题
              <Input
                className="mt-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：结算按钮点击后没有响应"
                maxLength={200}
                autoFocus
                required
              />
            </label>

            <label className="block text-xs font-extrabold">
              缺陷描述
              <span className="ml-2 font-normal text-[#8a93a0]">按模板补充</span>
              <Textarea
                className="mt-2 min-h-[250px] font-mono text-[12px] leading-6"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={20_000}
                required
              />
            </label>

            <div className="sticky bottom-0 -mx-4 grid grid-cols-[auto_1fr] gap-2 border-t border-[#e2e7ed] bg-[#fffdfa]/95 px-4 pb-1 pt-3 backdrop-blur-xl">
              <Button type="button" variant="outline" aria-label="放弃并重新圈选" title="重新圈选" onClick={reset}><RotateCcw size={16} /></Button>
              <Button disabled={phase === "submitting" || !title.trim()}>
                {phase === "submitting" ? <><LoaderCircle size={16} className="animate-spin" />正在提交</> : "创建缺陷"}
              </Button>
            </div>
          </form>
        )}

        {phase === "success" && (
          <section className="rise py-6">
            <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-[#e4f6eb] text-[#2f7952]"><Check size={27} strokeWidth={2.5} /></div>
            <div className="eyebrow text-[#2f7952]">Issue created</div>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-.05em]">缺陷已进入看板</h1>
            <div className="mt-4 rounded-xl border border-[#e0e5eb] bg-white p-3 font-mono text-xs">{issueId}</div>
            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "已复制" : "复制修复 Prompt"}</Button>
              <Button className="w-full" variant="outline" onClick={() => void chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/issues/${issueId}` })}>查看缺陷详情 <ExternalLink size={15} /></Button>
              <Button className="w-full" variant="ghost" onClick={reset}>继续圈选</Button>
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[#e5bfc4] bg-[#fff1f2] p-3 text-xs leading-5 text-[#a23a48]">
            <AlertTriangle className="mt-0.5 shrink-0" size={15} />{error}
          </div>
        )}
      </div>
    </main>
  );
}
