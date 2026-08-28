import { PENDING_CAPTURE_KEY, visualRegionDom } from "@/lib/capture";
import { captureAndOpenEditor, dismissCaptureEditorModal, installCaptureEditorModal, openEditorSurface } from "@/lib/editor";
import { AUTH_ERROR_KEY, AUTH_PENDING_KEY, OAUTH_STATE_KEY, beginOAuthLogin, completeSafariOAuthLogin, isSafariOAuthCallback, readOAuthState } from "@/lib/auth";
import { installDomPicker, installRegionPicker } from "@/lib/picker";
import { sanitizeUrl } from "@/lib/url";
import type { CaptureMode, DomContext, PendingCapture, Tokens } from "@/types";

let loginInFlight: Promise<Tokens | null> | null = null;

function sourcePageTabId(sender: chrome.runtime.MessageSender) {
  return sender.tab?.id !== undefined && sender.tab.url && /^https?:/.test(sender.tab.url)
    ? sender.tab.id
    : undefined;
}

function completeLogin() {
  loginInFlight ??= (async () => {
    await chrome.storage.local.set({ [AUTH_PENDING_KEY]: true });
    await chrome.storage.local.remove(AUTH_ERROR_KEY);
    try {
      const tokens = await beginOAuthLogin();
      if (tokens) await chrome.storage.local.set({ [AUTH_PENDING_KEY]: false });
      return tokens;
    } catch (error) {
      await chrome.storage.local.set({ [AUTH_ERROR_KEY]: error instanceof Error ? error.message : "授权流程未完成" });
      await chrome.storage.local.set({ [AUTH_PENDING_KEY]: false });
      throw error;
    }
  })().finally(() => { loginInFlight = null; });
  return loginInFlight;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url || !isSafariOAuthCallback(changeInfo.url)) return;
  void (async () => {
    const state = await readOAuthState();
    if (!state || state.tabId !== tabId) return;
    try {
      await completeSafariOAuthLogin(changeInfo.url!);
      await chrome.storage.local.remove(AUTH_ERROR_KEY);
    } catch (error) {
      await chrome.storage.local.set({ [AUTH_ERROR_KEY]: error instanceof Error ? error.message : "Safari 授权流程未完成" });
    } finally {
      await chrome.storage.local.set({ [AUTH_PENDING_KEY]: false });
      await chrome.storage.local.remove(OAUTH_STATE_KEY);
      await chrome.tabs.remove(tabId).catch(() => undefined);
    }
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const state = await readOAuthState();
    if (state?.tabId !== tabId) return;
    await chrome.storage.local.remove(OAUTH_STATE_KEY);
    await chrome.storage.local.set({ [AUTH_PENDING_KEY]: false, [AUTH_ERROR_KEY]: "Safari 授权已取消" });
  })();
});

async function startDomPicker(requestedTabId?: number) {
  const tab = requestedTabId === undefined
    ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
    : await chrome.tabs.get(requestedTabId).catch(() => undefined);
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) throw new Error("当前页面不支持脚本注入，请打开普通 HTTP/HTTPS 网页");
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: dismissCaptureEditorModal });
  await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
  const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: installDomPicker });
  const value = result[0]?.result as { started?: boolean; error?: string } | undefined;
  if (!value?.started) throw new Error(value?.error ?? "无法开启圈选");
}

async function startRegionPicker(requestedTabId?: number) {
  const tab = requestedTabId === undefined
    ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
    : await chrome.tabs.get(requestedTabId).catch(() => undefined);
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) throw new Error("当前页面不支持截图框选，请打开普通 HTTP/HTTPS 网页");
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: dismissCaptureEditorModal });
  await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
  const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: installRegionPicker });
  const value = result[0]?.result as { started?: boolean; error?: string } | undefined;
  if (!value?.started) throw new Error(value?.error ?? "无法开启截图框选");
}

async function storeCapture(sender: chrome.runtime.MessageSender, dom: DomContext, mode: CaptureMode) {
  const tab = sender.tab;
  if (!tab?.id || tab.windowId === undefined || !tab.url) throw new Error("无法读取当前页面");
  // A full-viewport PNG can be several megabytes and chrome.storage.local must
  // copy it before the editor can hydrate. A high-quality JPEG keeps text crisp
  // while making capture persistence and the following decode substantially
  // cheaper. The final selected region is encoded as WebP on submission.
  const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 92 });
  const capture: PendingCapture = { mode, tabId: tab.id, pageUrl: sanitizeUrl(tab.url), dom, screenshot };
  await chrome.storage.local.set({ [PENDING_CAPTURE_KEY]: capture });
  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#164DD8" });
  await chrome.action.setBadgeText({ tabId: tab.id, text: "1" });
  await chrome.action.setTitle({ tabId: tab.id, title: "已圈选问题，点击继续填写" });
}

async function openCaptureEditor(sourceTabId: number) {
  const editorUrl = chrome.runtime.getURL("capture-editor.html");
  await openEditorSurface(
    async () => {
      await chrome.scripting.executeScript({
        target: { tabId: sourceTabId },
        func: installCaptureEditorModal,
        args: [editorUrl]
      });
    }
  );
}

chrome.runtime.onMessage.addListener((message: {
  type?: string;
  tabId?: number;
  dom?: DomContext;
  region?: Pick<DomContext, "viewport" | "boundingRect">;
}, sender, sendResponse) => {
  if (message.type === "pinhere/complete-oauth-login") {
    void completeLogin().then(
      (tokens) => sendResponse({ ok: true, tokens: tokens ?? undefined }),
      (error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "授权流程未完成" })
    );
    return true;
  }
  if (message.type === "pinhere/start-dom-picker") {
    void startDomPicker(message.tabId ?? sourcePageTabId(sender)).then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法开启圈选" }));
    return true;
  }
  if (message.type === "pinhere/start-region-picker") {
    void startRegionPicker(message.tabId ?? sourcePageTabId(sender)).then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法开启截图框选" }));
    return true;
  }
  if (message.type === "pinhere/open-capture-editor") {
    const tabId = sourcePageTabId(sender);
    if (tabId === undefined) {
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (!tab?.id) throw new Error("无法读取当前页面");
        return openCaptureEditor(tab.id);
      }).then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法打开问题编辑器" }));
    } else {
      void openCaptureEditor(tabId).then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法打开问题编辑器" }));
    }
    return true;
  }
  if (message.type === "pinhere/dom-selected" && message.dom) {
    const tabId = sender.tab?.id;
    const dom = message.dom;
    if (tabId === undefined) {
      sendResponse({ ok: false, message: "无法读取圈选页面" });
      return false;
    }
    void captureAndOpenEditor(
      () => storeCapture(sender, dom, "dom"),
      () => openCaptureEditor(tabId)
    ).then(
      () => sendResponse({ ok: true }),
      (error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法打开问题编辑器" })
    );
    // Keep the service worker and response channel alive until screenshot
    // storage and the editor surface have both finished.
    return true;
  }
  if (message.type === "pinhere/region-selected" && message.region) {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      sendResponse({ ok: false, message: "无法读取框选页面" });
      return false;
    }
    const dom = visualRegionDom(message.region.viewport, message.region.boundingRect);
    void captureAndOpenEditor(
      () => storeCapture(sender, dom, "region"),
      () => openCaptureEditor(tabId)
    ).then(
      () => sendResponse({ ok: true }),
      (error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法打开问题编辑器" })
    );
    return true;
  }
  if ((message.type === "pinhere/dom-picker-cancelled" || message.type === "pinhere/region-picker-cancelled") && sender.tab?.id) {
    void chrome.action.setTitle({ tabId: sender.tab.id, title: "打开 Pinhere" });
  }
  return undefined;
});
