import { PENDING_CAPTURE_KEY } from "@/lib/capture";
import { AUTH_ERROR_KEY, AUTH_PENDING_KEY, OAUTH_STATE_KEY, beginOAuthLogin, completeSafariOAuthLogin, isSafariOAuthCallback, readOAuthState } from "@/lib/auth";
import { installDomPicker } from "@/lib/picker";
import { sanitizeUrl } from "@/lib/url";
import type { DomContext, PendingCapture, Tokens } from "@/types";

let loginInFlight: Promise<Tokens | null> | null = null;

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

async function startDomPicker() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) throw new Error("当前页面不支持脚本注入，请打开普通 HTTP/HTTPS 网页");
  await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
  const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: installDomPicker });
  const value = result[0]?.result as { started?: boolean; error?: string } | undefined;
  if (!value?.started) throw new Error(value?.error ?? "无法开启圈选");
}

async function storeCapture(sender: chrome.runtime.MessageSender, dom: DomContext) {
  const tab = sender.tab;
  if (!tab?.id || tab.windowId === undefined || !tab.url) throw new Error("无法读取当前页面");
  const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const capture: PendingCapture = { pageUrl: sanitizeUrl(tab.url), dom, screenshot };
  await chrome.storage.local.set({ [PENDING_CAPTURE_KEY]: capture });
  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#164DD8" });
  await chrome.action.setBadgeText({ tabId: tab.id, text: "1" });
  await chrome.action.setTitle({ tabId: tab.id, title: "已圈选问题，点击继续填写" });
}

function openCaptureEditor(tabId: number) {
  if (typeof chrome.sidePanel?.open !== "function") return Promise.resolve(false);
  return chrome.sidePanel.open({ tabId }).then(() => true, () => false);
}

chrome.runtime.onMessage.addListener((message: { type?: string; dom?: DomContext }, sender, sendResponse) => {
  if (message.type === "pinhere/complete-oauth-login") {
    void completeLogin().then(
      (tokens) => sendResponse({ ok: true, tokens: tokens ?? undefined }),
      (error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "授权流程未完成" })
    );
    return true;
  }
  if (message.type === "pinhere/start-dom-picker") {
    void startDomPicker().then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法开启圈选" }));
    return true;
  }
  if (message.type === "pinhere/dom-selected" && message.dom) {
    const editor = sender.tab?.id ? openCaptureEditor(sender.tab.id) : Promise.resolve(false);
    void Promise.all([storeCapture(sender, message.dom), editor]).catch(() => undefined);
  }
  if (message.type === "pinhere/dom-picker-cancelled" && sender.tab?.id) {
    void chrome.action.setTitle({ tabId: sender.tab.id, title: "打开 Pinhere" });
  }
  return undefined;
});
