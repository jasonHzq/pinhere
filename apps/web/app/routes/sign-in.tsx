import { useState } from "react";
import { ArrowUpRight, Github, LoaderCircle, Mail, MoveLeft, ShieldCheck } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link, useParams, useSearchParams } from "react-router";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";

export const meta: MetaFunction = ({ params }) => [
  { title: params.locale === "en" ? "Sign in | Pinhere" : "登录 | Pinhere" },
  { name: "robots", content: "noindex, nofollow" }
];

export default function SignIn() {
  const { locale = "zh-CN" } = useParams();
  const [params] = useSearchParams();
  const en = locale === "en";
  const callbackURL = params.get("returnTo") ?? `/${locale}/app`;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubError, setGithubError] = useState("");

  async function signInWithGithub() {
    setGithubBusy(true);
    setGithubError("");
    try {
      const result = await authClient.signIn.social({ provider: "github", callbackURL });
      if (result.error) setGithubError(result.error.message ?? (en ? "GitHub sign-in could not start." : "无法发起 GitHub 登录。"));
    } catch {
      setGithubError(en ? "GitHub sign-in could not start. Please try again." : "无法发起 GitHub 登录，请稍后重试。");
    } finally {
      setGithubBusy(false);
    }
  }

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    try {
      const result = await authClient.signIn.magicLink({ email, callbackURL });
      setStatus(result.error ? "error" : "sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="workspace-grid noise min-h-screen px-5 py-6 text-[#171a1d] md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between"><Logo locale={locale} /><Link className="focus-ring flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-[#69737c] transition-colors hover:bg-white/70 hover:text-[#171a1d]" to={`/${locale}`}><MoveLeft size={14} />{en ? "Back home" : "返回首页"}</Link></div>
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-[1120px] items-center gap-12 py-10 lg:grid-cols-[1fr_440px] lg:gap-24">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#bfcef9] bg-[#eff6ff] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-[#1d4ed8]"><span className="pulse-pin size-1.5 rounded-full bg-[#2563eb]" />{en ? "A quiet place for clear handoffs" : "让每一次交接都清清楚楚"}</div>
          <h1 className="font-display max-w-[620px] text-[clamp(3.2rem,6vw,5.5rem)] font-bold leading-[.98] tracking-[-.05em]">{en ? <>See it. Pin it.<br /><span className="text-[#2563eb]">Ship it.</span></> : <>看到问题，<br /><span className="text-[#2563eb]">就钉在这里。</span></>}</h1>
          <p className="mt-7 max-w-[520px] text-base leading-8 text-[#68737c]">{en ? "Your selected element, screenshot, and repair context stay together from first report to final fix." : "圈选元素、现场截图和修复上下文会始终待在一起，从发现问题一直到修复完成。"}</p>
          <div className="mt-10 flex items-center gap-3 text-xs font-medium text-[#526277]"><span className="grid size-9 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]"><ShieldCheck size={17} /></span>{en ? "Private by default · Minimal extension permissions" : "默认私密 · 扩展仅申请最小权限"}</div>
        </section>
        <Card className="warm-panel w-full p-6 sm:p-8">
          <div className="mb-7"><span className="font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[#5f7180]">Personal workspace</span><h1 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] lg:text-4xl">{en ? "Welcome back" : "欢迎回来"}</h1><p className="mt-2 text-sm leading-6 text-[#69737c]">{en ? "One account for the website and Chrome extension." : "网站与 Chrome 扩展使用同一个个人账号。"}</p></div>
          <Button className="w-full" variant="outline" type="button" disabled={githubBusy} onClick={() => void signInWithGithub()}>{githubBusy ? <LoaderCircle className="animate-spin" size={17} /> : <Github size={17} />}{en ? "Continue with GitHub" : "使用 GitHub 登录"}<ArrowUpRight className="ml-auto" size={15} /></Button>
          {githubError && <p className="mt-3 text-xs leading-5 text-[#bb2d3b]">{githubError}</p>}
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-[#d8dee4]" /><span className="font-mono text-[9px] tracking-[.12em] text-[#7d8790]">OR</span><span className="h-px flex-1 bg-[#d8dee4]" /></div>
          {status === "sent" ? <div role="status" className="rounded-2xl border border-[#bfd0d9] bg-[#eaf1f5] p-4 text-sm leading-6 text-[#365466]"><strong>{en ? "Check your inbox." : "请检查邮箱。"}</strong><br /><span className="text-[#5d7180]">{en ? "The one-time link expires in 10 minutes." : "一次性登录链接将在 10 分钟后过期。"}</span></div> : (
            <form onSubmit={sendLink} className="space-y-3"><label className="block text-xs font-semibold" htmlFor="email">{en ? "Email address" : "邮箱地址"}</label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /><Button className="w-full" disabled={status === "loading"}>{status === "loading" ? <LoaderCircle className="animate-spin" size={17} /> : <Mail size={17} />}{en ? "Email me a sign-in link" : "发送登录链接"}</Button>{status === "error" && <p role="alert" className="text-xs text-[#a93e3e]">{en ? "Could not send the link. Try again." : "登录链接发送失败，请重试。"}</p>}</form>
          )}
        </Card>
      </div>
    </main>
  );
}
