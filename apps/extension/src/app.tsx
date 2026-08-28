import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clipboard,
  Crosshair,
  ExternalLink,
  Home,
  ImageIcon,
  LoaderCircle,
  LogOut,
  Maximize2,
  MousePointer2,
  RotateCcw,
  ScanLine,
  Sparkles,
  X
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
import { clearPendingCapture, pendingCaptureBelongsToTab, PENDING_CAPTURE_KEY, readPendingCapture } from "@/lib/capture";
import { annotateScreenshot, cropAndCompress, prepareRegionScreenshot } from "@/lib/image";
import {
  IMAGE_EDITOR_DRAFT_KEY,
  IMAGE_EDITOR_RESULT_KEY,
  imageEditorUrl,
  readImageEditorResult
} from "@/lib/image-editor";
import {
  CAPTURE_TUTORIAL_DISMISSED_KEY,
  dismissCaptureTutorial,
  readCaptureTutorialVisibility,
  shouldShowCaptureTutorial
} from "@/lib/tutorial";
import type { Capture, PendingCapture, Project, Rect } from "@/types";

type Phase = "loading" | "signed_out" | "ready" | "captured" | "submitting" | "success";

const DESCRIPTION_TEMPLATE = `## 问题是什么


## 修复预期


## 复现方式
1. 打开页面
2.

## 补充说明
`;

function waitForFirstPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function captureLoadKey(capture: PendingCapture) {
  return `${capture.mode ?? "dom"}:${capture.tabId ?? ""}:${capture.pageUrl}:${capture.dom.cssSelector}:${capture.screenshot.length}`;
}

function sameRect(left: Rect | undefined, right: Rect | undefined) {
  if (!left || !right) return left === right;
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

function Logo() {
  return (
    <div className="flex items-center gap-2 font-extrabold tracking-[-.035em]">
      <img className="size-7" src="/icons/pinhere.svg" alt="" />
      <span>PINHERE</span>
    </div>
  );
}

function CapturePreparation() {
  return (
    <section className="rise space-y-4" aria-busy="true" aria-label="正在准备缺陷编辑器">
      <div className="flex items-start justify-between gap-3 border-b border-[#e2e7ed] pb-4">
        <div>
          <div className="eyebrow">New issue</div>
          <h1 className="mt-1 text-xl font-extrabold tracking-[-.035em]">整理这条缺陷</h1>
        </div>
        <span className="rounded-full bg-[#eef2f7] px-2.5 py-1 text-[10px] font-bold text-[#697386]">正在准备</span>
      </div>
      <div className="capture-preview-placeholder">
        <ImageIcon size={20} />
        <div><div className="font-extrabold">正在读取截图</div><p>图片会在界面显示后后台加载</p></div>
        <LoaderCircle className="ml-auto animate-spin text-[#315efb]" size={18} />
      </div>
      <Card className="p-3.5">
        <div className="eyebrow">Matched project</div>
        <div className="skeleton-line mt-2 w-32" />
        <div className="skeleton-line mt-3 w-full" />
      </Card>
      <label className="block text-xs font-extrabold">缺陷标题<Input className="mt-2" disabled placeholder="正在准备可编辑的缺陷…" /></label>
      <label className="block text-xs font-extrabold">缺陷描述<Textarea className="mt-2 min-h-[180px]" disabled placeholder="截图加载期间会先显示这里" /></label>
    </section>
  );
}

export function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [initialCrop, setInitialCrop] = useState<Rect | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(DESCRIPTION_TEMPLATE);
  const [error, setError] = useState("");
  const [issueId, setIssueId] = useState("");
  const [issueIdStatus, setIssueIdStatus] = useState<"pending" | "generated" | "fallback">("pending");
  const [handoffPrompt, setHandoffPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(true);
  const [imageEditorWindowId, setImageEditorWindowId] = useState<number | null>(null);
  const activeCaptureLoad = useRef<string | null>(null);
  const preparedSubmissionImage = useRef<{
    screenshot: string;
    crop: Rect;
    highlight?: Rect;
    promise: ReturnType<typeof cropAndCompress>;
  } | null>(null);

  function prepareSubmissionImage(current: Capture) {
    const prepared = preparedSubmissionImage.current;
    if (prepared
      && prepared.screenshot === current.screenshot
      && sameRect(prepared.crop, current.crop)
      && sameRect(prepared.highlight, current.highlight)) {
      return prepared.promise;
    }
    const promise = cropAndCompress(current.screenshot, current.crop, current.highlight);
    preparedSubmissionImage.current = {
      screenshot: current.screenshot,
      crop: current.crop,
      highlight: current.highlight,
      promise
    };
    return promise;
  }

  async function hydratePendingCapture(pending: PendingCapture, loadKey: string) {
    try {
      // Let React paint the editor shell before decoding and annotating a potentially
      // multi-megabyte screenshot. The image is enhancement, not a prerequisite for
      // entering the issue title and description.
      await waitForFirstPaint();

      const projectRequest = apiFetch(`/api/v1/projects/resolve?url=${encodeURIComponent(pending.pageUrl)}`);
      const mode = pending.mode ?? "dom";
      const annotationRequest = mode === "region"
        ? prepareRegionScreenshot(pending.screenshot, pending.dom)
        : annotateScreenshot(pending.screenshot, pending.dom);
      const [projectResponse, annotated] = await Promise.all([projectRequest, annotationRequest]);
      const projectBody = await projectResponse.json();
      if (!projectResponse.ok) throw new Error(projectBody.error?.message ?? "项目匹配失败");
      const project = projectBody.data.project as Project | null;
      if (!project) {
        const origin = new URL(pending.pageUrl).origin;
        await chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/projects?origin=${encodeURIComponent(origin)}` });
        throw new Error(`尚未为 ${origin} 配置项目，已打开新建项目页面`);
      }

      if (activeCaptureLoad.current !== loadKey) return;
      setCapture({
        mode,
        pageUrl: pending.pageUrl,
        dom: pending.dom,
        project,
        screenshot: annotated.screenshot,
        crop: annotated.crop,
        highlight: annotated.highlight
      });
      setInitialCrop(annotated.crop);
      await clearPendingCapture();
    } catch (reason) {
      if (activeCaptureLoad.current !== loadKey) return;
      setCapture(null);
      setInitialCrop(null);
      setError(reason instanceof Error ? reason.message : "无法准备已圈选的问题");
      setPhase("ready");
    } finally {
      if (activeCaptureLoad.current === loadKey) activeCaptureLoad.current = null;
    }
  }

  async function resumePendingCapture() {
    const pending = await readPendingCapture();
    if (!pending) return false;
    const sourceTab = pending.tabId === undefined
      ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
      : await chrome.tabs.get(pending.tabId).catch(() => undefined);
    if (!pendingCaptureBelongsToTab(pending, sourceTab)) return false;
    if (document.documentElement.classList.contains("pinhere-panel-page")) {
      const response = await chrome.runtime.sendMessage({ type: "pinhere/open-capture-editor" }) as { ok?: boolean; message?: string };
      if (!response?.ok) throw new Error(response?.message ?? "无法打开页面内缺陷编辑器");
      window.close();
      return true;
    }
    const loadKey = captureLoadKey(pending);
    if (activeCaptureLoad.current === loadKey) return true;

    activeCaptureLoad.current = loadKey;
    setCapture(null);
    setInitialCrop(null);
    setTitle("");
    setDescription(DESCRIPTION_TEMPLATE);
    setError("");
    setPhase("captured");
    void hydratePendingCapture(pending, loadKey);
    return true;
  }

  async function restoreAuthorization() {
    try {
      const [status, showTutorial] = await Promise.all([
        readAuthorizationStatus(),
        readCaptureTutorialVisibility()
      ]);
      setAuthorizing(status.pending);
      setTutorialVisible(showTutorial);
      if (!status.tokens) {
        setError(status.error);
        setPhase("signed_out");
        return;
      }
      setError("");
      if (!(await resumePendingCapture())) setPhase("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法恢复已圈选的问题");
      setPhase("ready");
    }
  }

  useEffect(() => {
    void restoreAuthorization();
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      const imageEditorResult = readImageEditorResult(changes[IMAGE_EDITOR_RESULT_KEY]?.newValue);
      if (imageEditorResult) {
        setCapture((current) => current ? { ...current, crop: imageEditorResult.crop } : current);
        void chrome.storage.local.remove([IMAGE_EDITOR_DRAFT_KEY, IMAGE_EDITOR_RESULT_KEY]);
      }
      const authChanged = [TOKEN_KEY, AUTH_PENDING_KEY, AUTH_ERROR_KEY].some((key) => key in changes);
      const captureArrived = Boolean(changes[PENDING_CAPTURE_KEY]?.newValue);
      if (CAPTURE_TUTORIAL_DISMISSED_KEY in changes) {
        setTutorialVisible(shouldShowCaptureTutorial(changes[CAPTURE_TUTORIAL_DISMISSED_KEY]?.newValue));
      }
      if (authChanged || captureArrived) void restoreAuthorization();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    if (imageEditorWindowId === null) return;
    const listener = (windowId: number) => {
      if (windowId !== imageEditorWindowId) return;
      setImageEditorWindowId(null);
      void chrome.storage.local.remove(IMAGE_EDITOR_DRAFT_KEY);
    };
    chrome.windows.onRemoved.addListener(listener);
    return () => chrome.windows.onRemoved.removeListener(listener);
  }, [imageEditorWindowId]);

  useEffect(() => {
    if (!capture) {
      preparedSubmissionImage.current = null;
      return;
    }
    // Most reporters spend several seconds writing the title and description.
    // Use that time to decode, crop and compress the screenshot instead of doing
    // all of that work after they click Create.
    const timer = window.setTimeout(() => {
      void prepareSubmissionImage(capture).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [capture]);

  useEffect(() => {
    if (phase !== "success" || issueIdStatus !== "pending" || !issueId) return;
    let active = true;
    const refreshReadableId = async () => {
      try {
        const response = await apiFetch(`/api/v1/issues/${encodeURIComponent(issueId)}`);
        const body = await response.json().catch(() => null);
        if (!active || !response.ok || !body?.data) return;
        setIssueId(body.data.id);
        setIssueIdStatus(body.data.idStatus);
        setHandoffPrompt(body.data.handoffPrompt);
      } catch { /* Keep polling while the success panel remains open. */ }
    };
    const timer = window.setInterval(() => void refreshReadableId(), 1_500);
    void refreshReadableId();
    return () => { active = false; window.clearInterval(timer); };
  }, [issueId, issueIdStatus, phase]);

  async function authorize() {
    if (authorizing) return;
    setAuthorizing(true);
    setError("");
    let waitingForSafari = false;
    try {
      const tokens = await login();
      waitingForSafari = !tokens;
      if (tokens && !(await resumePendingCapture())) setPhase("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      if (!waitingForSafari) setAuthorizing(false);
    }
  }

  async function startCapture() {
    setError("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("无法读取当前页面，请重新打开插件后再试");
      const response = await chrome.runtime.sendMessage({ type: "pinhere/start-dom-picker", tabId: tab.id }) as { ok?: boolean; message?: string };
      if (!response?.ok) throw new Error(response?.message ?? "无法开启圈选");
      window.close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "圈选失败");
    }
  }

  async function startRegionCapture() {
    setError("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("无法读取当前页面，请重新打开插件后再试");
      const response = await chrome.runtime.sendMessage({ type: "pinhere/start-region-picker", tabId: tab.id }) as { ok?: boolean; message?: string };
      if (!response?.ok) throw new Error(response?.message ?? "无法开启截图框选");
      window.close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "截图框选失败");
    }
  }

  async function closeTutorial() {
    setTutorialVisible(false);
    try {
      await dismissCaptureTutorial();
    } catch {
      setTutorialVisible(true);
      setError("暂时无法保存引导偏好，请重试");
    }
  }

  async function openImageEditor() {
    if (!capture || !initialCrop) return;
    if (imageEditorWindowId !== null) {
      try {
        await chrome.windows.update(imageEditorWindowId, { focused: true });
        return;
      } catch {
        setImageEditorWindowId(null);
      }
    }

    const sessionId = crypto.randomUUID();
    await chrome.storage.local.set({
      [IMAGE_EDITOR_DRAFT_KEY]: {
        sessionId,
        screenshot: capture.screenshot,
        crop: capture.crop,
        initialCrop
      }
    });

    try {
      const editorWindow = await chrome.windows.create({
        url: imageEditorUrl(sessionId),
        type: "popup",
        width: 1180,
        height: 860,
        focused: true
      });
      setImageEditorWindowId(editorWindow?.id ?? null);
    } catch (reason) {
      await chrome.storage.local.remove(IMAGE_EDITOR_DRAFT_KEY);
      setError(reason instanceof Error ? reason.message : "无法打开图片编辑窗口");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!capture) return;
    setPhase("submitting");
    setError("");
    try {
      const image = await prepareSubmissionImage(capture);
      const response = await apiFetch("/api/v1/issues", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          projectId: capture.project.id,
          title: title.trim(),
          description: description.trim(),
          pageUrl: capture.pageUrl,
          dom: capture.dom,
          screenshot: {
            fileName: `pinhere-${Date.now()}.${image.extension}`,
            contentType: image.contentType,
            base64: image.base64
          },
          source: "extension"
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "缺陷提交失败");
      setIssueId(body.data.id);
      setIssueIdStatus(body.data.idStatus);
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
    preparedSubmissionImage.current = null;
    setPhase("signed_out");
  }

  const reset = () => {
    setCapture(null);
    preparedSubmissionImage.current = null;
    setInitialCrop(null);
    setTitle("");
    setDescription(DESCRIPTION_TEMPLATE);
    setIssueId("");
    setIssueIdStatus("pending");
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
        {phase === "loading" && <CapturePreparation />}

        {phase === "signed_out" && (
          <section className="rise py-2">
            <div className="eyebrow">Extension access</div>
            <h1 className="mt-2 text-[24px] font-extrabold leading-[1.05] tracking-[-.045em]">连接，然后圈选</h1>
            <p className="mt-3 text-[13px] leading-6 text-[#697386]">读取匹配项目、捕获页面上下文，并在当前网页的编辑弹窗中整理缺陷。</p>
            <div className="mt-5 rounded-2xl border border-[#cbd8e6] bg-[#f4f8ff] p-4 text-xs leading-5 text-[#526477] shadow-[0_12px_32px_rgba(35,48,68,.06)]">
              只有在你主动标记并点击“创建缺陷”后，Pinhere 才会上传当前页面 URL 和截图；选择 DOM 模式时还会上传已清洗的元素结构。不会持续读取浏览记录、Cookie、密码或表单值。
              <button type="button" className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[11px] font-bold text-[#315efb]" onClick={() => void chrome.tabs.create({ url: `${BASE_URL}/zh-CN/privacy` })}>查看隐私政策 <ExternalLink size={11} /></button>
            </div>
            <Button className="mt-4 w-full" disabled={authorizing} onClick={() => void authorize()}>
              {authorizing ? <><LoaderCircle className="animate-spin" size={15} />正在完成授权…</> : <>理解并授权登录 <ExternalLink size={15} /></>}
            </Button>
          </section>
        )}

        {phase === "ready" && (
          <section className="rise">
            {tutorialVisible && <div className="capture-intro">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Capture modes · ready</span>
                <button type="button" className="tutorial-close focus-ring" aria-label="不再显示使用引导" title="不再显示" onClick={() => void closeTutorial()}><X size={14} /></button>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf2ff] text-[#315efb]"><Crosshair size={18} /></span>
                <div>
                  <h1 className="text-[18px] font-extrabold leading-tight tracking-[-.04em]">标记页面上的问题</h1>
                  <p className="mt-1.5 text-[11px] leading-[1.55] text-[#697386]">按问题边界选择方式，两种方式都会进入同一个缺陷编辑流程。</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#e6eaf0] pt-3 text-center text-[9px] font-semibold text-[#7a8494]">
                <span>① 选择方式</span><span>② 标记</span><span>③ 提交</span>
              </div>
            </div>}
            <div className={tutorialVisible ? "mt-3 space-y-2" : "space-y-2"} aria-label="选择问题标记方式">
              <button type="button" className="capture-mode-button capture-mode-button-dom focus-ring" onClick={() => void startCapture()}>
                <span className="capture-mode-icon"><MousePointer2 size={17} /></span>
                <span className="min-w-0 flex-1 text-left"><strong>选择 DOM 元素</strong><small>自动附带选择器和元素结构</small></span>
                <span className="capture-mode-tag">精确定位</span>
                <ChevronRight className="capture-mode-arrow" size={15} />
              </button>
              <button type="button" className="capture-mode-button capture-mode-button-region focus-ring" onClick={() => void startRegionCapture()}>
                <span className="capture-mode-icon"><ScanLine size={17} /></span>
                <span className="min-w-0 flex-1 text-left"><strong>框选截图区域</strong><small>跨 DOM 自由框选任意范围</small></span>
                <span className="capture-mode-tag">自由范围</span>
                <ChevronRight className="capture-mode-arrow" size={15} />
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] leading-4 text-[#8b94a2]">不支持浏览器内部页、iframe 与关闭的 Shadow DOM</p>
          </section>
        )}

        {(phase === "captured" || phase === "submitting") && (
          <form onSubmit={submit} className="rise space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#e2e7ed] pb-4">
              <div>
                <div className="eyebrow">New issue</div>
                <h1 className="mt-1 text-xl font-extrabold tracking-[-.035em]">整理这条缺陷</h1>
              </div>
              <span className="rounded-full bg-[#eaf7ef] px-2.5 py-1 text-[10px] font-bold text-[#357254]">{capture ? (capture.mode === "region" ? "区域截图" : "DOM 元素") : "准备中"}</span>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold"><ImageIcon size={14} className="text-[#315efb]" />{capture?.mode === "region" ? "截图区域" : "截图编辑"}</div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[#697386] hover:bg-[#edf1f5]"
                    disabled={!capture || !initialCrop}
                    onClick={() => capture && initialCrop && setCapture({ ...capture, crop: initialCrop })}
                  >
                    <RotateCcw size={11} />恢复选区
                  </button>
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[#c9d5ff] bg-[#edf2ff] px-2.5 py-1.5 text-[10px] font-extrabold text-[#315efb] transition-colors hover:border-[#9db1ff] hover:bg-[#e2e9ff]"
                    disabled={!capture}
                    onClick={() => void openImageEditor()}
                  >
                  <Maximize2 size={12} />{capture ? (imageEditorWindowId === null ? "放大编辑" : "返回编辑窗口") : "正在加载截图"}
                </button>
              </div>
            </div>
              {capture ? (
                <Cropper src={capture.screenshot} crop={capture.crop} onChange={(crop) => setCapture({ ...capture, crop })} />
              ) : (
                <div className="capture-preview-placeholder" aria-label="截图正在后台加载">
                  <ImageIcon size={20} />
                  <div><div className="font-extrabold">截图正在后台准备</div><p>不影响填写标题和描述</p></div>
                  <LoaderCircle className="ml-auto animate-spin text-[#315efb]" size={18} />
                </div>
              )}
              <p className="mt-2 text-[10px] leading-4 text-[#7d8795]">{capture?.mode === "region" ? "默认使用刚才在页面上框选的范围；仍可在这里微调。" : "可直接拖动重新框选；需要看清细节时，点击“放大编辑”进入独立窗口。"}</p>
            </section>

            <Card className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="eyebrow">Matched project</div>
                  {capture ? <div className="mt-1 truncate text-sm font-extrabold">{capture.project.name}</div> : <div className="skeleton-line mt-2 w-32" />}
                </div>
                <Sparkles size={16} className="shrink-0 text-[#315efb]" />
              </div>
              {capture ? <div className="mt-2 truncate font-mono text-[9px] text-[#7d8795]">{capture.pageUrl}</div> : <div className="skeleton-line mt-3 w-full" />}
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
              <Button disabled={!capture || phase === "submitting" || !title.trim()}>
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
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e0e5eb] bg-white p-3 font-mono text-xs">{issueIdStatus === "pending" ? <><LoaderCircle className="animate-spin text-[#315efb]" size={14} />正在生成可读 ID…</> : issueId}</div>
            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "已复制" : "复制修复 Prompt"}</Button>
              <Button className="w-full" variant="outline" onClick={() => void chrome.tabs.create({ url: `${BASE_URL}/zh-CN/app/issues/${encodeURIComponent(issueId)}` })}>查看缺陷详情 <ExternalLink size={15} /></Button>
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
