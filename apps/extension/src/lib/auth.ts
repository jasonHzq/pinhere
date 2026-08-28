import type { Tokens } from "@/types";

const BASE_URL = import.meta.env.VITE_PINHERE_URL ?? "https://pinhere.dev";
export const TOKEN_KEY = "pinhere_tokens";
export const AUTH_PENDING_KEY = "pinhere_auth_pending";
export const AUTH_ERROR_KEY = "pinhere_auth_error";
export const OAUTH_STATE_KEY = "pinhere_oauth_state";

type OAuthState = { verifier: string; redirectUri: string; startedAt: number; tabId?: number };

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function challenge(verifier: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export async function readTokens() {
  const value = await chrome.storage.local.get(TOKEN_KEY);
  return (value[TOKEN_KEY] as Tokens | undefined) ?? null;
}

export async function readAuthorizationStatus() {
  const value = await chrome.storage.local.get([TOKEN_KEY, AUTH_PENDING_KEY, AUTH_ERROR_KEY, OAUTH_STATE_KEY]);
  let pending = value[AUTH_PENDING_KEY] === true;
  let error = typeof value[AUTH_ERROR_KEY] === "string" ? value[AUTH_ERROR_KEY] : "";
  const oauth = value[OAUTH_STATE_KEY] as OAuthState | undefined;
  if (pending && typeof chrome.identity?.launchWebAuthFlow !== "function" && (!oauth || Date.now() - oauth.startedAt > 10 * 60_000)) {
    pending = false;
    error = "Safari 授权已过期，请重新登录";
    await chrome.storage.local.remove(OAUTH_STATE_KEY);
    await chrome.storage.local.set({ [AUTH_PENDING_KEY]: false, [AUTH_ERROR_KEY]: error });
  }
  return {
    tokens: (value[TOKEN_KEY] as Tokens | undefined) ?? null,
    pending,
    error
  };
}

async function saveTokens(value: { accessToken: string; refreshToken: string; expiresIn: number }) {
  const tokens: Tokens = { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: Date.now() + value.expiresIn * 1_000 };
  await chrome.storage.local.set({ [TOKEN_KEY]: tokens });
  return tokens;
}

async function exchangeAuthorizationCode(code: string, redirectUri: string, verifier: string) {
  const response = await fetch(`${BASE_URL}/api/v1/oauth/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grantType: "authorization_code", code, redirectUri, codeVerifier: verifier }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "授权失败");
  return saveTokens(body.data);
}

async function completeChromeOAuthLogin() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const redirectUri = chrome.identity.getRedirectURL("oauth2");
  const url = new URL("/zh-CN/extension/authorize", BASE_URL);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge", await challenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  const callback = await chrome.identity.launchWebAuthFlow({ interactive: true, url: url.toString() });
  if (!callback) throw new Error("授权流程未返回结果");
  const code = new URL(callback).searchParams.get("code");
  if (!code) throw new Error("授权码缺失");
  return exchangeAuthorizationCode(code, redirectUri, verifier);
}

function safariRedirectUri() {
  return new URL("/zh-CN/extension/authorized", BASE_URL).toString();
}

export function isSafariOAuthCallback(value: string) {
  try {
    const url = new URL(value);
    const expected = new URL(safariRedirectUri());
    return url.origin === expected.origin && url.pathname === expected.pathname && url.searchParams.has("code");
  } catch {
    return false;
  }
}

async function beginSafariOAuthLogin() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const redirectUri = safariRedirectUri();
  const state: OAuthState = { verifier, redirectUri, startedAt: Date.now() };
  await chrome.storage.local.set({ [OAUTH_STATE_KEY]: state });
  const url = new URL("/zh-CN/extension/authorize", BASE_URL);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge", await challenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  try {
    const tab = await chrome.tabs.create({ url: url.toString(), active: true });
    await chrome.storage.local.set({ [OAUTH_STATE_KEY]: { ...state, tabId: tab.id } satisfies OAuthState });
  } catch (error) {
    await chrome.storage.local.remove(OAUTH_STATE_KEY);
    throw error;
  }
  return null;
}

export async function beginOAuthLogin() {
  if (typeof chrome.identity?.launchWebAuthFlow === "function") return completeChromeOAuthLogin();
  return beginSafariOAuthLogin();
}

export async function completeSafariOAuthLogin(callback: string) {
  if (!isSafariOAuthCallback(callback)) throw new Error("无效的 Safari 授权回调");
  const stored = await chrome.storage.local.get(OAUTH_STATE_KEY);
  const state = stored[OAUTH_STATE_KEY] as OAuthState | undefined;
  if (!state || Date.now() - state.startedAt > 10 * 60_000) throw new Error("Safari 授权已过期，请重试");
  const url = new URL(callback);
  if (url.origin + url.pathname !== state.redirectUri) throw new Error("Safari 授权回调不匹配");
  const code = url.searchParams.get("code");
  if (!code) throw new Error("授权码缺失");
  const tokens = await exchangeAuthorizationCode(code, state.redirectUri, state.verifier);
  await chrome.storage.local.remove(OAUTH_STATE_KEY);
  return tokens;
}

export async function readOAuthState() {
  const stored = await chrome.storage.local.get(OAUTH_STATE_KEY);
  return (stored[OAUTH_STATE_KEY] as OAuthState | undefined) ?? null;
}

export async function login() {
  const result = await chrome.runtime.sendMessage({ type: "pinhere/complete-oauth-login" }) as { ok?: boolean; tokens?: Tokens; message?: string } | undefined;
  if (!result?.ok) throw new Error(result?.message ?? "授权流程未完成，请重试");
  return result.tokens ?? null;
}

async function refresh(tokens: Tokens) {
  const response = await fetch(`${BASE_URL}/api/v1/oauth/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grantType: "refresh_token", refreshToken: tokens.refreshToken }) });
  const body = await response.json();
  if (!response.ok) { await chrome.storage.local.remove(TOKEN_KEY); throw new Error("登录已过期，请重新授权"); }
  return saveTokens(body.data);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  let tokens = await readTokens();
  if (!tokens) throw new Error("请先登录");
  if (tokens.expiresAt < Date.now() + 30_000) tokens = await refresh(tokens);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${tokens.accessToken}`);
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    tokens = await refresh(tokens);
    headers.set("authorization", `Bearer ${tokens.accessToken}`);
    return fetch(`${BASE_URL}${path}`, { ...init, headers });
  }
  return response;
}

export async function logout() { await chrome.storage.local.remove([TOKEN_KEY, AUTH_PENDING_KEY, AUTH_ERROR_KEY, OAUTH_STATE_KEY]); }
export { BASE_URL };
