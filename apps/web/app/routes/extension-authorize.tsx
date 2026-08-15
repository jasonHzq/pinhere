import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { redirect, useLoaderData, useParams, useSearchParams } from "react-router";
import type { Route } from "./+types/extension-authorize";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getPrincipal } from "~/lib/principal.server";

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

export default function ExtensionAuthorize() {
  const { redirectUri, codeChallenge } = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function authorize() {
    setBusy(true); setError("");
    const response = await fetch("/api/v1/oauth/extension/authorize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redirectUri, codeChallenge }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message ?? "Authorization failed"); setBusy(false); return; }
    window.location.assign(body.data.redirectUrl);
  }
  return <main className="grid min-h-screen place-items-center bg-[#f5f5f2] px-5 py-12 text-[#151515]"><div className="w-full max-w-[500px]"><div className="mb-6"><Logo locale={locale} /></div><Card className="overflow-hidden rounded-[18px] border-[#151515] bg-white shadow-[7px_7px_0_#151515]"><div className="bg-[#151515] p-7 text-white"><img className="mb-7 size-10" src="/pinhere-mark.svg" alt="" /><div className="font-mono text-[10px] uppercase tracking-[.18em] text-white/45">Chrome Extension</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">{en ? "Connect Pinhere" : "连接 Pinhere 扩展"}</h1><p className="mt-3 text-sm leading-6 text-white/60">{en ? "The extension will receive only the permissions needed to resolve projects, create issues and upload screenshots." : "扩展只会获得匹配项目、创建缺陷和上传截图所需的最小权限。"}</p></div><div className="p-7"><ul className="mb-7 space-y-3 text-sm">{[en ? "Read your project origins" : "读取你的项目 Origin", en ? "Create issues from selected pages" : "从圈选页面创建缺陷", en ? "Upload private screenshots" : "上传私有截图"].map((item) => <li key={item} className="flex items-center gap-3"><CheckCircle2 size={17} className="text-[#151515]" />{item}</li>)}</ul><div className="mb-5 flex items-start gap-2 rounded-xl border border-[#dededb] bg-[#f5f5f2] p-3 text-[11px] leading-5 text-[#5f5f5f]"><ShieldCheck className="mt-0.5 shrink-0 text-[#151515]" size={15} />{en ? "Pinhere never requests access to every website or Chrome debugger data." : "Pinhere 不会申请访问所有网站，也不会读取 Chrome 调试器数据。"}</div>{error && <p className="mb-3 text-xs text-[#bb2d3b]">{error}</p>}<Button className="w-full border-[#151515] bg-[#151515] shadow-[0_4px_12px_rgba(0,0,0,.14)] hover:bg-[#303030]" size="lg" disabled={busy} onClick={() => void authorize()}>{busy ? "…" : en ? "Authorize extension" : "授权 Chrome 扩展"}</Button></div></Card></div></main>;
}
