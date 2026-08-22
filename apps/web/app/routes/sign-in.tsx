import { useState } from "react";
import { Github, LoaderCircle, Mail, MoveLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";

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
    const result = await authClient.signIn.magicLink({ email, callbackURL });
    setStatus(result.error ? "error" : "sent");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-5 py-12 text-[#151515]">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center justify-between"><Logo locale={locale} /><Link className="focus-ring flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#696969] hover:bg-black/5" to={`/${locale}`}><MoveLeft size={14} />{en ? "Back" : "返回"}</Link></div>
        <Card className="rounded-[18px] border-[#151515] bg-white p-7 shadow-[7px_7px_0_#151515] md:p-9">
          <div className="mb-7"><span className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#151515]">Personal workspace</span><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">{en ? "Sign in to continue" : "登录你的工作台"}</h1><p className="mt-2 text-sm leading-6 text-[#696969]">{en ? "One account for the website and Chrome extension." : "网站与 Chrome 扩展使用同一个个人账号。"}</p></div>
          <Button className="w-full border-[#151515] bg-white text-[#151515] shadow-none hover:bg-[#f5f5f2]" variant="outline" type="button" disabled={githubBusy} onClick={() => void signInWithGithub()}>{githubBusy ? <LoaderCircle className="animate-spin" size={17} /> : <Github size={17} />}{en ? "Continue with GitHub" : "使用 GitHub 登录"}</Button>
          {githubError && <p className="mt-3 text-xs leading-5 text-[#bb2d3b]">{githubError}</p>}
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-[#dfdfdc]" /><span className="font-mono text-[10px] text-[#858585]">OR</span><span className="h-px flex-1 bg-[#dfdfdc]" /></div>
          {status === "sent" ? <div className="rounded-xl border border-[#151515] bg-[#151515] p-4 text-sm leading-6 text-white"><strong>{en ? "Check your inbox." : "请检查邮箱。"}</strong><br /><span className="text-white/65">{en ? "The one-time link expires in 10 minutes." : "一次性登录链接将在 10 分钟后过期。"}</span></div> : (
            <form onSubmit={sendLink} className="space-y-3"><label className="block text-xs font-bold" htmlFor="email">{en ? "Email address" : "邮箱地址"}</label><Input className="border-[#bdbdb9] bg-white focus:border-[#151515]" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /><Button className="w-full border-[#151515] bg-[#151515] shadow-[0_4px_12px_rgba(0,0,0,.14)] hover:bg-[#303030]" disabled={status === "loading"}>{status === "loading" ? <LoaderCircle className="animate-spin" size={17} /> : <Mail size={17} />}{en ? "Email me a sign-in link" : "发送魔法登录链接"}</Button>{status === "error" && <p className="text-xs text-[#bb2d3b]">{en ? "Could not send the link. Try again." : "登录链接发送失败，请重试。"}</p>}</form>
          )}
        </Card>
      </div>
    </main>
  );
}
