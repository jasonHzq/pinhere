import { ArrowUpRight, Bug, CircleHelp, Github, LifeBuoy, MoveLeft, ShieldAlert } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link, redirect, useParams } from "react-router";
import type { Route } from "./+types/support";
import { Logo } from "~/components/logo";

export const meta: MetaFunction = ({ params }) => {
  const en = params.locale === "en";
  return [
    { title: en ? "Support | Pinhere" : "支持 | Pinhere" },
    { name: "description", content: en ? "Get installation help, report a problem, or contact the Pinhere maintainers." : "获取安装帮助、报告问题或联系 Pinhere 维护者。" },
    { name: "robots", content: "index, follow" }
  ];
};

export function loader({ params }: Route.LoaderArgs) {
  if (params.locale !== "en" && params.locale !== "zh-CN") throw redirect("/zh-CN/support", { status: 301 });
  return null;
}

export default function Support() {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const cards = en ? [
    [CircleHelp, "Installation help", "Include your Chrome version, operating system, and the step where installation or authorization stopped."],
    [Bug, "Report a product issue", "Share clear reproduction steps. Remove passwords, access tokens, customer data, and other secrets before posting."],
    [ShieldAlert, "Privacy or security", "Describe the affected Pinhere surface without posting confidential evidence publicly. Ask the maintainer for a private follow-up channel."]
  ] as const : [
    [CircleHelp, "安装与授权帮助", "请提供 Chrome 版本、操作系统，以及安装或授权停在哪一步。"],
    [Bug, "报告产品问题", "请提供清晰的复现步骤。发布前移除密码、访问令牌、客户数据和其他秘密。"],
    [ShieldAlert, "隐私与安全", "请说明受影响的 Pinhere 功能，但不要公开机密证据；可以要求维护者提供私下跟进方式。"]
  ] as const;

  return (
    <main className="workspace-grid noise min-h-screen text-[#171a1d]">
      <header className="border-b border-[#d8dee4]/80 bg-[#f4f6f8]/90"><div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-4 md:px-8"><Logo locale={locale} /><Link className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cbd5df] bg-white/80 px-3 text-xs font-semibold" to={`/${locale}`}><MoveLeft size={14} />{en ? "Back home" : "返回首页"}</Link></div></header>
      <section className="mx-auto max-w-[1120px] px-5 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#bfcef9] bg-[#eff6ff] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.13em] text-[#1d4ed8]"><LifeBuoy size={13} />Pinhere support</div>
        <h1 className="font-display mt-6 max-w-[820px] text-[clamp(3rem,8vw,6rem)] font-bold leading-[.94] tracking-[-.055em]">{en ? "Let’s get the handoff moving again." : "让问题交接重新跑起来。"}</h1>
        <p className="mt-7 max-w-[720px] text-base leading-8 text-[#637381]">{en ? "Pinhere support is handled in the public GitHub repository. Search existing reports first, then open an issue with the smallest reproducible example you can share safely." : "Pinhere 目前通过公开 GitHub 仓库提供支持。请先搜索已有问题，再提交一份不含敏感信息的最小复现。"}</p>

        <div className="mt-12 grid gap-3 md:grid-cols-3">{cards.map(([Icon, title, description], index) => <article key={title} className="rounded-[22px] border border-[#cad5df] bg-white/80 p-6 shadow-[0_12px_34px_rgba(37,70,110,.06)]"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[#e5edff] text-[#2563eb]"><Icon size={18} /></span><span className="font-mono text-[10px] text-[#7a8792]">0{index + 1}</span></div><h2 className="font-display mt-8 text-2xl font-bold tracking-[-.035em]">{title}</h2><p className="mt-3 text-sm leading-7 text-[#667684]">{description}</p></article>)}</div>

        <div className="mt-10 overflow-hidden rounded-[26px] border border-[#0f172a] bg-[#0f172a] p-7 text-white shadow-[0_24px_60px_rgba(15,23,42,.2)] sm:p-10"><div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-[#93c5fd]">GitHub / jasonHzq/pinhere</div><h2 className="font-display mt-4 text-3xl font-bold tracking-[-.04em]">{en ? "Open a support issue" : "创建支持 Issue"}</h2><p className="mt-3 max-w-[650px] text-sm leading-7 text-white/62">{en ? "Do not include screenshots or DOM content containing personal information. For account deletion, state the request without posting account identifiers publicly." : "不要附带包含个人信息的截图或 DOM 内容。申请删除账号时，请只说明请求类型，不要公开账号标识。"}</p></div><a className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#0f172a]" href="https://github.com/jasonHzq/pinhere/issues/new" rel="noreferrer" target="_blank"><Github size={17} />{en ? "Open GitHub" : "打开 GitHub"}<ArrowUpRight size={15} /></a></div></div>

        <div className="mt-8 flex flex-wrap gap-4 text-xs"><Link className="focus-ring rounded-md text-[#1d4ed8]" to={`/${locale}/privacy`}>{en ? "Privacy policy" : "隐私政策"}</Link><a className="focus-ring rounded-md text-[#657581]" href="https://github.com/jasonHzq/pinhere" rel="noreferrer" target="_blank">{en ? "Source repository" : "源代码仓库"}</a></div>
      </section>
    </main>
  );
}
