import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { MetaFunction } from "react-router";
import { redirect, useParams } from "react-router";
import type { Route } from "./+types/extension-authorize";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { issueExtensionAuthorizationCode, parseExtensionRedirectUri } from "~/lib/extension-oauth.server";
import { getPrincipal } from "~/lib/principal.server";

export const meta: MetaFunction = () => [
  { title: "Authorize extension | Pinhere" },
  { name: "robots", content: "noindex, nofollow" }
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri");
  const codeChallenge = url.searchParams.get("code_challenge");
  if (!redirectUri || !codeChallenge) throw new Response("Missing OAuth parameters", { status: 400 });
  const principal = await getPrincipal(request);
  if (!principal) {
    const returnTo = `${url.pathname}${url.search}`;
    throw redirect(`/${params.locale ?? "zh-CN"}/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return { redirectUri, codeChallenge };
}

export async function action({ request, params }: Route.ActionArgs) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri");
  const codeChallenge = url.searchParams.get("code_challenge");
  const redirectTarget = redirectUri ? parseExtensionRedirectUri(redirectUri, url.origin) : null;
  if (!redirectTarget || !codeChallenge || codeChallenge.length < 43 || codeChallenge.length > 128) {
    throw new Response("Invalid OAuth parameters", { status: 400 });
  }
  const principal = await getPrincipal(request);
  if (!principal) {
    const returnTo = `${url.pathname}${url.search}`;
    throw redirect(`/${params.locale ?? "zh-CN"}/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (principal.actorType !== "user") throw new Response("A website session is required", { status: 403 });
  throw redirect(await issueExtensionAuthorizationCode(principal.userId, redirectTarget, codeChallenge));
}

export default function ExtensionAuthorize() {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const [busy, setBusy] = useState(false);
  return <main className="workspace-grid noise grid min-h-screen place-items-center px-5 py-12 text-[#171a1d]"><div className="w-full max-w-[520px]"><Card className="warm-panel overflow-hidden"><div className="relative overflow-hidden bg-[#202a33] p-7 text-white sm:p-9"><span className="absolute -right-14 -top-16 size-52 rounded-full border border-white/10" /><span className="absolute -right-4 -top-7 size-28 rounded-full border border-white/10" /><span className="relative mb-8 grid size-11 place-items-center rounded-2xl bg-white"><img className="size-7" src="/pinhere-mark.svg" alt="" /></span><div className="relative font-mono text-[10px] uppercase tracking-[.16em] text-[#8eabbc]">Browser Extension</div><h1 className="font-display relative mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">{en ? "Connect Pinhere" : "连接 Pinhere 扩展"}</h1><p className="relative mt-3 text-sm leading-6 text-white/62">{en ? "The extension will receive only the permissions needed to resolve projects, create issues and upload screenshots." : "扩展只会获得匹配项目、创建缺陷和上传截图所需的最小权限。"}</p></div><div className="p-7 sm:p-9"><ul className="mb-7 space-y-3 text-sm">{[en ? "Read your project origins" : "读取你的项目 Origin", en ? "Create issues from selected pages" : "从圈选页面创建缺陷", en ? "Upload private screenshots" : "上传私有截图"].map((item) => <li key={item} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e7edf2] text-[#405d6e]"><CheckCircle2 size={15} /></span>{item}</li>)}</ul><div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-[#d8dee4] bg-[#f1f4f6] p-3.5 text-[11px] leading-5 text-[#606b74]"><ShieldCheck className="mt-0.5 shrink-0 text-[#4b6574]" size={16} />{en ? "Pinhere never requests access to every website or browser debugger data." : "Pinhere 不会申请访问所有网站，也不会读取浏览器调试器数据。"}</div><form method="post" onSubmit={() => setBusy(true)}><Button className="w-full" size="lg" disabled={busy} type="submit">{busy ? "…" : en ? "Authorize extension" : "授权浏览器扩展"}</Button></form></div></Card></div></main>;
}
