import { Check, Link2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { redirect, useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/agent-pair";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getPrincipal } from "~/lib/principal.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  const principal = await getPrincipal(request);
  if (!principal) throw redirect(`/${params.locale ?? "zh-CN"}/sign-in?returnTo=${encodeURIComponent(new URL(request.url).pathname + new URL(request.url).search)}`);
  return { code };
}

export default function AgentPair() {
  const { code } = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function approve() {
    if (!code || state !== "idle") return;
    setState("busy"); setError("");
    try {
      const response = await fetch(`/api/v1/agent-pairings/${encodeURIComponent(code)}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? (en ? "Pairing failed." : "配对失败。"));
      setState("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (en ? "Pairing failed." : "配对失败。"));
      setState("idle");
    }
  }

  return <main className="page-shell grid min-h-screen place-items-center py-12"><Card className="w-full max-w-lg p-7 sm:p-9"><div className="grid size-12 place-items-center rounded-2xl bg-[#e7edf2] text-[#344c5a]">{state === "done" ? <Check size={23} /> : <Link2 size={23} />}</div><h1 className="mt-6 font-display text-3xl font-bold tracking-[-.04em]">{state === "done" ? (en ? "Agent paired" : "Agent 已配对") : (en ? "Pair Pinhere Agent" : "配对 Pinhere Agent")}</h1><p className="mt-3 text-sm leading-6 text-[#687680]">{state === "done" ? (en ? "You can return to the terminal. The CLI will continue automatically." : "可以返回终端，CLI 会自动继续。") : (en ? "Approve this one-time code to let the local CLI process your Pinhere issues." : "批准这个一次性验证码，让本地 CLI 处理你的 Pinhere 问题。")}</p><div className="mt-6 rounded-xl bg-[#202a33] p-4 text-center font-mono text-lg tracking-[.2em] text-white">{code || "—"}</div>{error && <p role="alert" className="mt-4 rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{error}</p>}{state !== "done" && <Button className="mt-6 w-full" disabled={!code || state === "busy"} onClick={() => void approve()}>{state === "busy" ? <LoaderCircle className="animate-spin" size={16} /> : <Link2 size={16} />}{en ? "Approve pairing" : "批准配对"}</Button>}</Card></main>;
}

