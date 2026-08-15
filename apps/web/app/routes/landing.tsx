import type { MetaFunction } from "react-router";
import { ArrowUpRight, Check, CircleDot, MousePointer2, ScanSearch, WandSparkles } from "lucide-react";
import { Link, useParams } from "react-router";
import { Logo } from "~/components/logo";
import { buttonVariants } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/cn";

export const meta: MetaFunction = ({ params }) => {
  const en = params.locale === "en";
  return [
    { title: en ? "Pinhere — Point at the bug. Ship the fix." : "Pinhere — 圈出问题，交付修复" },
    { name: "description", content: en ? "Capture exact UI context and hand it to your coding agent." : "在网页上圈出缺陷，把准确上下文交给你的 AI 编程 Agent。" },
    { tagName: "link", rel: "canonical", href: `https://pinhere.dev/${en ? "en" : "zh-CN"}` },
    { tagName: "link", rel: "alternate", hrefLang: "zh-CN", href: "https://pinhere.dev/zh-CN" },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: "https://pinhere.dev/en" }
  ];
};

const copy = {
  zh: {
    eyebrow: "浏览器到代码仓库的精确交接",
    titleA: "别再描述",
    titleB: "它在哪里。",
    body: "直接圈选出错的 DOM。Pinhere 会保留页面、结构和截图，让你的 AI Agent 领取缺陷、修复并写回结果。",
    cta: "开始使用",
    secondary: "查看工作流",
    steps: ["圈选 DOM", "结构化缺陷", "Agent 领取", "状态写回"],
    promise: "没有实时服务，没有仓库绑定，没有黑盒。只有一份稳定协议和可复现的缺陷上下文。",
    board: ["待处理", "处理中", "已完成"]
  },
  en: {
    eyebrow: "A precise handoff from browser to repository",
    titleA: "Stop explaining",
    titleB: "where it broke.",
    body: "Point at the failing DOM. Pinhere keeps the page, structure and screenshot so your coding agent can claim, fix and report back.",
    cta: "Get started",
    secondary: "See the workflow",
    steps: ["Select DOM", "Structure issue", "Agent claims", "Status returns"],
    promise: "No realtime service, repository binding or black box. Just a stable contract and reproducible defect context.",
    board: ["OPEN", "IN PROGRESS", "DONE"]
  }
};

export default function Landing() {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const t = en ? copy.en : copy.zh;
  return (
    <main className="noise min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-[1220px] items-center justify-between px-5 py-6 md:px-8">
        <Logo locale={locale} />
        <nav className="flex items-center gap-2">
          <Link className="focus-ring rounded-lg px-3 py-2 font-mono text-xs text-[#696d67] hover:text-[#171916]" to={`/${en ? "zh-CN" : "en"}`}>{en ? "中文" : "EN"}</Link>
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")} to={`/${locale}/sign-in`}>{en ? "Sign in" : "登录"}</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1220px] gap-12 px-5 pb-24 pt-14 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-24">
        <div>
          <div className="animate-rise mb-6 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[.14em] text-[#164dd8]">
            <CircleDot size={13} /> {t.eyebrow}
          </div>
          <h1 className="animate-rise delay-1 max-w-[760px] text-[clamp(3.6rem,8vw,7.7rem)] font-extrabold leading-[.84] tracking-[-.075em]">
            {t.titleA}<br /><span className="text-[#164dd8]">{t.titleB}</span>
          </h1>
          <p className="animate-rise delay-2 mt-8 max-w-[620px] text-lg leading-8 text-[#5f635d] md:text-xl">{t.body}</p>
          <div className="animate-rise delay-3 mt-9 flex flex-wrap gap-3">
            <Link className={cn(buttonVariants({ size: "lg" }), "group")} to={`/${locale}/sign-in`}>{t.cta}<ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={18} /></Link>
            <a className={cn(buttonVariants({ variant: "outline", size: "lg" }))} href="#workflow">{t.secondary}</a>
          </div>
        </div>

        <div className="animate-rise delay-2 relative mx-auto w-full max-w-[600px] lg:mx-0">
          <div className="absolute -inset-6 -z-10 rotate-2 rounded-[28px] border border-[#c8c6bd] bg-[#e5e3dc]" />
          <Card className="overflow-hidden border-[#b9b8b1] bg-[#171916] text-white shadow-[0_32px_80px_rgba(20,22,19,.22)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#255ff0]" /><span className="font-mono text-[11px] text-white/60">app.pinhere.dev / checkout</span></div>
              <ScanSearch size={17} className="text-white/40" />
            </div>
            <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_65%_20%,#294b80_0,#172031_35%,#111410_75%)] p-7">
              <div className="grid h-full grid-cols-[.38fr_.62fr] gap-4 opacity-75">
                <div className="rounded-xl border border-white/10 bg-white/[.04] p-4"><div className="h-3 w-16 rounded bg-white/15" /><div className="mt-8 space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-7 rounded-md bg-white/[.07]" />)}</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[.06] p-5"><div className="h-4 w-28 rounded bg-white/15" /><div className="mt-5 h-24 rounded-lg bg-white/[.06]" /><div className="mt-4 h-10 rounded-lg bg-white/[.08]" /></div>
              </div>
              <div className="absolute left-[45%] top-[48%] h-[17%] w-[43%] rounded-[7px] border-2 border-[#4c7cff] bg-[#164dd81c] shadow-[0_0_0_999px_rgba(2,5,10,.28),0_0_25px_#164dd880]">
                <div className="absolute -top-7 left-0 rounded-md bg-[#255ff0] px-2 py-1 font-mono text-[10px]">button.checkout</div>
                <span className="absolute -bottom-1 -right-1 size-2 rounded-full border border-white bg-[#255ff0]" />
              </div>
              <MousePointer2 className="absolute bottom-[31%] right-[12%] fill-white text-[#171916]" size={28} />
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              {t.board.map((label, index) => <div key={label} className="border-r border-white/10 px-4 py-3 last:border-0"><div className="mb-1 font-mono text-[9px] text-white/35">0{index + 1}</div><div className="text-xs font-bold">{label}</div></div>)}
            </div>
          </Card>
        </div>
      </section>

      <section id="workflow" className="border-y border-[#d6d5ce] bg-[#ebe9e2]/75">
        <div className="mx-auto grid max-w-[1220px] md:grid-cols-4">
          {t.steps.map((step, index) => {
            const icons = [MousePointer2, ScanSearch, WandSparkles, Check];
            const Icon = icons[index]!;
            return <div key={step} className="group border-b border-[#d6d5ce] p-7 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="mb-12 flex items-center justify-between"><span className="font-mono text-[11px] text-[#8b8e87]">0{index + 1}</span><Icon size={20} className="text-[#164dd8] transition-transform group-hover:rotate-[-8deg] group-hover:scale-110" /></div><h2 className="text-xl font-bold tracking-[-.03em]">{step}</h2></div>;
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 py-24 md:px-8">
        <div className="grid gap-8 border-l-4 border-[#164dd8] pl-6 md:grid-cols-[1fr_auto] md:items-end md:pl-10">
          <p className="max-w-[850px] text-[clamp(1.7rem,4vw,3.5rem)] font-semibold leading-[1.12] tracking-[-.045em]">{t.promise}</p>
          <span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#7f827c]">Pinhere protocol / v1</span>
        </div>
      </section>
    </main>
  );
}
