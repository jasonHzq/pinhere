import type { Tokens } from "@/types";

const BASE_URL = import.meta.env.VITE_PINHERE_URL ?? "https://pinhere.dev";
const TOKEN_KEY = "pinhere_tokens";

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

async function saveTokens(value: { accessToken: string; refreshToken: string; expiresIn: number }) {
  const tokens: Tokens = { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: Date.now() + value.expiresIn * 1_000 };
  await chrome.storage.local.set({ [TOKEN_KEY]: tokens });
  return tokens;
}

export async function completeOAuthLogin() {
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
  const response = await fetch(`${BASE_URL}/api/v1/oauth/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grantType: "authorization_code", code, redirectUri, codeVerifier: verifier }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "授权失败");
  return saveTokens(body.data);
}

export async function login() {
  const result = await chrome.runtime.sendMessage({ type: "pinhere/complete-oauth-login" }) as { ok?: boolean; tokens?: Tokens; message?: string } | undefined;
  if (!result?.ok || !result.tokens) throw new Error(result?.message ?? "授权流程未完成，请重试");
  return result.tokens;
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

export async function logout() { await chrome.storage.local.remove(TOKEN_KEY); }
export { BASE_URL };
