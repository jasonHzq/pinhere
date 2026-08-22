import { PENDING_CAPTURE_KEY } from "@/lib/capture";
import { completeOAuthLogin } from "@/lib/auth";
import { installDomPicker } from "@/lib/picker";
import { sanitizeUrl } from "@/lib/url";
import type { DomContext, PendingCapture, Tokens } from "@/types";

let loginInFlight: Promise<Tokens> | null = null;

function completeLogin() {
  loginInFlight ??= completeOAuthLogin().finally(() => { loginInFlight = null; });
  return loginInFlight;
}

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
  await chrome.storage.session.set({ [PENDING_CAPTURE_KEY]: capture });
  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#164DD8" });
  await chrome.action.setBadgeText({ tabId: tab.id, text: "1" });
  await chrome.action.setTitle({ tabId: tab.id, title: "已圈选问题，点击继续填写" });
}

chrome.runtime.onMessage.addListener((message: { type?: string; dom?: DomContext }, sender, sendResponse) => {
  if (message.type === "pinhere/complete-oauth-login") {
    void completeLogin().then(
      (tokens) => sendResponse({ ok: true, tokens }),
      (error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "授权流程未完成" })
    );
    return true;
  }
  if (message.type === "pinhere/start-dom-picker") {
    void startDomPicker().then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "无法开启圈选" }));
    return true;
  }
  if (message.type === "pinhere/dom-selected" && message.dom) {
    void storeCapture(sender, message.dom).catch(() => undefined);
  }
  if (message.type === "pinhere/dom-picker-cancelled" && sender.tab?.id) {
    void chrome.action.setTitle({ tabId: sender.tab.id, title: "打开 Pinhere" });
  }
  return undefined;
});
