import type { MetaFunction } from "react-router";
import { ArrowUpRight, Check, CircleDot, MousePointer2, ScanSearch, WandSparkles } from "lucide-react";
import { Link, redirect, useParams } from "react-router";
import type { Route } from "./+types/landing";
import { Logo } from "~/components/logo";
import { buttonVariants } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/cn";

export const meta: MetaFunction = ({ params }) => {
  const en = params.locale === "en";
  const canonical = `https://pinhere.dev/${en ? "en" : "zh-CN"}`;
  const title = en ? "Visual Bug Reporting for AI Coding Agents | Pinhere" : "网页 Bug 标注工具，精准交给 AI 编程 Agent | Pinhere";
  const description = en
    ? "Capture webpage bugs with exact DOM context and screenshots. Pinhere turns visual feedback into structured issues your AI coding agent can claim, fix, and report back."
    : "用 Pinhere Chrome 扩展圈选网页 DOM、截图并记录上下文，将前端 Bug 转成 AI 编程 Agent 可领取、修复和回写的结构化缺陷。";
  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { name: "theme-color", content: "#121212" },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Pinhere" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:locale", content: en ? "en_US" : "zh_CN" },
    { property: "og:locale:alternate", content: en ? "zh_CN" : "en_US" },
    { property: "og:image", content: "https://pinhere.dev/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: en ? "Pinhere visual bug reporting workflow" : "Pinhere 可视化网页 Bug 反馈工作流" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: "https://pinhere.dev/og-image.png" },
    { tagName: "link", rel: "canonical", href: canonical },
    { tagName: "link", rel: "alternate", hrefLang: "zh-CN", href: "https://pinhere.dev/zh-CN" },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: "https://pinhere.dev/en" },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: "https://pinhere.dev/" },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://pinhere.dev/#website",
            url: "https://pinhere.dev/",
            name: "Pinhere",
            alternateName: "Pinhere Bug Reporter",
            inLanguage: ["zh-CN", "en"]
          },
          {
            "@type": "SoftwareApplication",
            "@id": "https://pinhere.dev/#software",
            name: "Pinhere",
            url: canonical,
            description,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Google Chrome, Web",
            browserRequirements: "Requires Google Chrome 116 or later",
            inLanguage: en ? "en" : "zh-CN",
            featureList: en
              ? ["DOM element selection", "Annotated screenshots", "Structured issue handoff", "AI coding agent workflow"]
              : ["DOM 元素圈选", "网页截图标注", "结构化缺陷交接", "AI 编程 Agent 工作流"],
            publisher: {
              "@type": "Organization",
              "@id": "https://pinhere.dev/#organization",
              name: "Pinhere",
              url: "https://pinhere.dev/",
              logo: {
                "@type": "ImageObject",
                url: "https://pinhere.dev/pinhere-mark.svg"
              }
            }
          }
        ]
      }
    }
  ];
};

export function loader({ params }: Route.LoaderArgs) {
  if (params.locale !== "en" && params.locale !== "zh-CN") {
    throw redirect("/zh-CN", { status: 301 });
  }
  return null;
}

const copy = {
  zh: {
    eyebrow: "浏览器到代码仓库的精确交接",
    titleA: "别再描述",
    titleB: "它在哪里。",
    body: "直接圈选出错的 DOM。Pinhere 会保留页面、结构和截图，让你的 AI Agent 领取缺陷、修复并写回结果。",
    cta: "开始使用",
    secondary: "查看工作流",
    workflowLabel: "从页面现场到修复结果",
    nav: ["工作流", "核心能力", "常见问题"],
    steps: ["圈选 DOM", "结构化缺陷", "Agent 领取", "状态写回"],
    promise: "没有实时服务，没有仓库绑定，没有黑盒。只有一份稳定协议和可复现的缺陷上下文。",
    board: ["待处理", "处理中", "已完成"],
    featuresEyebrow: "给前端反馈一份可执行的上下文",
    featuresTitle: "从“这里不对”到 Agent 可以直接动手",
    featuresIntro: "Pinhere 是连接网页现场与代码修复流程的可视化 Bug 反馈工具。它把页面地址、DOM 元素、截图和描述收进同一份结构化缺陷，减少产品、设计、测试与开发之间的往返确认。",
    features: [
      ["精准圈选网页元素", "通过 Chrome 扩展直接选择出错的 DOM 元素，保留页面 URL、元素结构和可复现定位信息，不再依赖含糊的文字描述。"],
      ["截图与问题上下文同行", "把界面截图、标注和缺陷描述放在一起。无论是样式错位、文案错误还是交互异常，接手者都能快速理解现场。"],
      ["为 AI 编程 Agent 准备", "通过稳定 API 暴露结构化缺陷，让 AI 编程助手领取任务、更新处理状态，并把修复结果写回工作台。"]
    ],
    useCasesTitle: "适合谁使用 Pinhere？",
    useCases: [
      ["产品与设计", "在验收页面时直接指出具体元素，让视觉反馈与实现位置一一对应。"],
      ["测试与前端", "记录可复现的 UI Bug，减少截图、地址、选择器分散在多个工具里的情况。"],
      ["AI 编程团队", "把真实页面上下文交给 coding agent，建立从发现、领取到修复回写的闭环。"]
    ],
    faqTitle: "关于网页 Bug 标注与 AI 修复",
    faq: [
      ["Pinhere 和普通截图工具有什么不同？", "普通截图只保存像素。Pinhere 还会记录被选中的 DOM 元素、页面来源和结构化状态，因此缺陷可以被开发者或 AI 编程 Agent 继续处理。"],
      ["它可以替代项目管理工具吗？", "Pinhere 聚焦网页 UI 缺陷的采集与交接。它提供轻量工作台和稳定协议，不要求绑定代码仓库，也不把复杂项目管理强加到反馈流程里。"],
      ["搜索引擎或其他网站会看到私有截图吗？", "不会。公开落地页可被搜索引擎索引；登录页、工作台、授权页面和私有缺陷均明确禁止索引，并受账号权限保护。"]
    ],
    footer: "面向产品、设计、测试、前端开发与 AI 编程 Agent 的可视化 Bug 反馈工具。"
  },
  en: {
    eyebrow: "A precise handoff from browser to repository",
    titleA: "Stop explaining",
    titleB: "where it broke.",
    body: "Point at the failing DOM. Pinhere keeps the page, structure and screenshot so your coding agent can claim, fix and report back.",
    cta: "Get started",
    secondary: "View workflow",
    workflowLabel: "From page context to shipped fix",
    nav: ["Workflow", "Capabilities", "FAQ"],
    steps: ["Select DOM", "Structure issue", "Agent claims", "Status returns"],
    promise: "No realtime service, repository binding or black box. Just a stable contract and reproducible defect context.",
    board: ["OPEN", "IN PROGRESS", "DONE"],
    featuresEyebrow: "Give frontend feedback executable context",
    featuresTitle: "From “something is wrong here” to agent-ready work",
    featuresIntro: "Pinhere is a visual bug reporting tool that connects the live webpage to the code-fixing workflow. It keeps the page URL, selected DOM element, screenshot, and description in one structured issue, cutting the back-and-forth between product, design, QA, and engineering.",
    features: [
      ["Select the exact DOM element", "Use the Chrome extension to point at the broken element and preserve its page URL, structure, and reproducible location instead of relying on vague written directions."],
      ["Keep screenshots in context", "Store the interface capture, annotation, and issue description together. Layout defects, copy mistakes, and interaction bugs remain easy to understand when they change hands."],
      ["Built for AI coding agents", "Expose structured issues through a stable API so an AI coding assistant can claim work, update its status, and report the completed fix back to the board."]
    ],
    useCasesTitle: "Who uses Pinhere?",
    useCases: [
      ["Product and design", "Point to the exact element during review so every visual comment maps to an implementation target."],
      ["QA and frontend", "Capture reproducible UI bugs without scattering screenshots, URLs, and selectors across separate tools."],
      ["AI engineering teams", "Give coding agents real browser context and close the loop from discovery and claim to fix and status update."]
    ],
    faqTitle: "Visual bug reporting and AI fixes",
    faq: [
      ["How is Pinhere different from a screenshot tool?", "A screenshot stores pixels. Pinhere also records the selected DOM element, page origin, and structured status, so a developer or AI coding agent can continue the work."],
      ["Does it replace project management software?", "Pinhere focuses on capturing and handing off webpage UI defects. It provides a lightweight board and stable protocol without forcing repository binding or heavyweight project management into feedback."],
      ["Can search engines see private screenshots?", "No. Only the public landing pages are indexable. Sign-in, workspace, authorization, and private issue pages are marked noindex and remain protected by account permissions."]
    ],
    footer: "Visual bug reporting for product, design, QA, frontend engineering, and AI coding agents."
  }
};

export default function Landing() {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const t = en ? copy.en : copy.zh;
  return (
    <main className="workspace-grid min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-[1220px] items-center justify-between px-5 py-5 md:px-8 md:py-6">
        <Logo locale={locale} />
        <nav aria-label={en ? "Primary navigation" : "主导航"} className="flex items-center gap-2">
          <div className="mr-2 hidden items-center gap-1 lg:flex">
            {t.nav.map((item, index) => <a key={item} className="focus-ring rounded-lg px-3 py-2 text-xs font-medium text-[#696d67] hover:text-[#171916]" href={["#workflow", "#capabilities", "#faq"][index]}>{item}</a>)}
          </div>
          <Link className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 py-2 font-mono text-xs text-[#696d67] hover:text-[#171916]" to={`/${en ? "zh-CN" : "en"}`}>{en ? "中文" : "EN"}</Link>
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")} to={`/${locale}/sign-in`}>{en ? "Sign in" : "登录"}</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1220px] gap-8 px-5 pb-16 pt-10 sm:gap-12 sm:pb-20 sm:pt-14 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-24 lg:pt-24">
        <div className="min-w-0">
          <div className="animate-rise mb-5 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[.08em] text-[#3d3d39] sm:mb-6 sm:text-[11px] sm:tracking-[.14em]">
            <CircleDot className="shrink-0" size={13} /> <span className="min-w-0">{t.eyebrow}</span>
          </div>
          <h1 className="animate-rise delay-1 max-w-[760px] text-[clamp(3.35rem,15vw,7.7rem)] font-extrabold leading-[.88] tracking-[-.065em] sm:text-[clamp(3.6rem,8vw,7.7rem)] sm:leading-[.84] sm:tracking-[-.075em]">
            {t.titleA}<br /><span className="text-[#4b4b46]">{t.titleB}</span>
          </h1>
          <p className="animate-rise delay-2 mt-6 max-w-[620px] text-pretty text-lg leading-7 text-[#5f635d] sm:mt-8 sm:leading-8 md:text-xl">{t.body}</p>
          <div className="animate-rise delay-3 mt-7 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:mt-9 sm:flex sm:flex-wrap">
            <Link className={cn(buttonVariants({ size: "lg" }), "group min-w-0 px-3 text-sm sm:w-auto sm:px-5 sm:text-base")} to={`/${locale}/sign-in`}>{t.cta}<ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={18} /></Link>
            <a className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-0 px-3 text-sm sm:w-auto sm:px-5 sm:text-base")} href="#workflow">{t.secondary}</a>
          </div>
        </div>

        <div className="animate-rise delay-2 relative mx-auto min-w-0 w-full max-w-[600px] lg:mx-0">
          <div className="absolute inset-x-3 -bottom-3 top-3 -z-10 rounded-[20px] bg-[#d9d9d4]" />
          <Card className="overflow-hidden rounded-[18px] border-[#2c2c29] bg-[#171717] text-white shadow-[0_18px_50px_rgba(18,18,18,.16)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-white" /><span className="font-mono text-[11px] text-white/60">app.pinhere.dev / checkout</span></div>
              <ScanSearch size={17} className="text-white/40" />
            </div>
            <div className="relative aspect-[16/10] bg-[#1d1d1b] p-4 sm:aspect-[4/3] sm:p-7">
              <div className="grid h-full grid-cols-[.34fr_.66fr] gap-3 opacity-75 sm:grid-cols-[.38fr_.62fr] sm:gap-4">
                <div className="rounded-lg border border-white/10 bg-white/[.035] p-3 sm:rounded-xl sm:p-4"><div className="h-2.5 w-12 rounded-full bg-white/15 sm:h-3 sm:w-16" /><div className="mt-5 space-y-2 sm:mt-8 sm:space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-5 rounded bg-white/[.07] sm:h-7 sm:rounded-md" />)}</div></div>
                <div className="rounded-lg border border-white/10 bg-white/[.05] p-3 sm:rounded-xl sm:p-5"><div className="h-3 w-20 rounded-full bg-white/15 sm:h-4 sm:w-28" /><div className="mt-4 h-16 rounded-md bg-white/[.06] sm:mt-5 sm:h-24 sm:rounded-lg" /><div className="mt-3 h-7 rounded-md bg-white/[.08] sm:mt-4 sm:h-10 sm:rounded-lg" /></div>
              </div>
              <div className="absolute left-[44%] top-[48%] h-[20%] w-[44%] rounded-[6px] border-2 border-white bg-white/10 shadow-[0_0_0_999px_rgba(2,5,10,.28)] sm:left-[45%] sm:h-[17%] sm:w-[43%] sm:rounded-[7px]">
                <div className="absolute -top-6 left-0 rounded-md bg-white px-2 py-1 font-mono text-[9px] text-[#151515] sm:-top-7 sm:text-[10px]">button.checkout</div>
                <span className="absolute -bottom-1 -right-1 size-2 rounded-full border border-[#151515] bg-white" />
              </div>
              <MousePointer2 className="absolute bottom-[22%] right-[11%] fill-white text-[#171916] sm:bottom-[31%] sm:right-[12%]" size={25} />
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              {t.board.map((label, index) => <div key={label} className="border-r border-white/10 px-3 py-2.5 last:border-0 sm:px-4 sm:py-3"><div className="mb-0.5 font-mono text-[8px] text-white/50 sm:mb-1 sm:text-[9px]">0{index + 1}</div><div className="text-[11px] font-bold sm:text-xs">{label}</div></div>)}
            </div>
          </Card>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-4 border-y border-[#deded9] bg-[#fafafa]">
        <div className="mx-auto max-w-[1220px]">
          <div className="flex items-center justify-between border-b border-[#d6d5ce] px-5 py-4 font-mono text-[10px] uppercase tracking-[.12em] text-[#73766f] md:px-7">
            <span>{t.workflowLabel}</span><span>01—04</span>
          </div>
          <div className="grid md:grid-cols-4">
            {t.steps.map((step, index) => {
              const icons = [MousePointer2, ScanSearch, WandSparkles, Check];
              const Icon = icons[index]!;
              return <div key={step} className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-[#d6d5ce] px-5 py-5 last:border-b-0 md:grid-cols-[1fr_auto] md:gap-0 md:border-b-0 md:border-r md:p-7 md:last:border-r-0"><span className="col-start-1 row-start-1 font-mono text-[10px] text-[#6f726c] md:text-[11px]">0{index + 1}</span><h2 className="col-start-2 row-start-1 text-lg font-bold tracking-[-.03em] md:col-span-2 md:col-start-1 md:row-start-2 md:mt-12 md:text-xl">{step}</h2><Icon aria-hidden="true" size={20} className="col-start-3 row-start-1 text-[#20201e] transition-transform group-hover:rotate-[-8deg] group-hover:scale-110 md:col-start-2" /></div>;
            })}
          </div>
        </div>
      </section>

      <section id="capabilities" className="scroll-mt-4 mx-auto max-w-[1220px] px-5 py-20 md:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <div>
            <div className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[.14em] text-[#73766f]">{t.featuresEyebrow}</div>
            <h2 className="text-balance text-[clamp(2.4rem,5vw,5rem)] font-extrabold leading-[.94] tracking-[-.06em]">{t.featuresTitle}</h2>
            <p className="mt-7 max-w-[580px] text-pretty text-base leading-7 text-[#646760]">{t.featuresIntro}</p>
          </div>
          <div className="border-t border-[#171717]">
            {t.features.map(([title, description], index) => (
              <article key={title} className="grid gap-4 border-b border-[#d6d5ce] py-7 sm:grid-cols-[3rem_1fr] sm:py-9">
                <span className="font-mono text-[11px] text-[#6f726c]">0{index + 1}</span>
                <div><h3 className="text-xl font-bold tracking-[-.03em]">{title}</h3><p className="mt-3 max-w-[650px] text-sm leading-7 text-[#646760]">{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#deded9] bg-[#171717] text-white">
        <div className="mx-auto max-w-[1220px] px-5 py-16 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <h2 className="text-3xl font-extrabold tracking-[-.045em]">{t.useCasesTitle}</h2>
            <div className="grid gap-px border border-white/15 bg-white/15 md:grid-cols-3">
              {t.useCases.map(([title, description]) => <article key={title} className="bg-[#171717] p-5 sm:p-6"><h3 className="font-mono text-xs font-medium uppercase tracking-[.1em]">{title}</h3><p className="mt-5 text-pretty text-sm leading-6 text-white/65">{description}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 py-16 sm:py-20 md:px-8 lg:py-24">
        <div className="grid gap-8 border-l-4 border-[#171717] pl-6 md:grid-cols-[1fr_auto] md:items-end md:pl-10"><p className="max-w-[850px] text-[clamp(1.7rem,4vw,3.5rem)] font-semibold leading-[1.12] tracking-[-.045em]">{t.promise}</p><span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#7f827c]">Pinhere protocol / v1</span></div>
      </section>

      <section id="faq" className="scroll-mt-4 border-t border-[#deded9] bg-[#fafafa]">
        <div className="mx-auto grid max-w-[1220px] gap-10 px-5 py-16 sm:py-20 md:px-8 lg:grid-cols-[.72fr_1.28fr] lg:py-24">
          <h2 className="text-balance text-[clamp(2rem,4vw,3.8rem)] font-extrabold leading-[1] tracking-[-.055em]">{t.faqTitle}</h2>
          <div>
            {t.faq.map(([question, answer]) => <article key={question} className="border-t border-[#cfcfca] py-7 last:border-b"><h3 className="text-lg font-bold tracking-[-.025em]">{question}</h3><p className="mt-3 max-w-[720px] text-sm leading-7 text-[#646760]">{answer}</p></article>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#deded9] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><Logo locale={locale} /><p className="mt-3 max-w-[620px] text-xs leading-5 text-[#73766f]">{t.footer}</p></div><div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-[#73766f]"><a className="focus-ring rounded-sm" href="#workflow">{t.nav[0]}</a><a className="focus-ring rounded-sm" href="#capabilities">{t.nav[1]}</a><Link className="focus-ring rounded-sm" to={`/${locale}/sign-in`}>{en ? "Sign in" : "登录"}</Link></div></div>
      </footer>
    </main>
  );
}
