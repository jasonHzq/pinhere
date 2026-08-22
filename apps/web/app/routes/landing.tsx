import type { MetaFunction } from "react-router";
import { Apple, ArrowDown, ArrowUpRight, Check, ChevronDown, Chrome, CircleDot, Download, FolderOpen, MousePointer2, Puzzle, ScanSearch, WandSparkles } from "lucide-react";
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
    : "用 Pinhere Safari 或 Chrome 扩展圈选网页 DOM、截图并记录上下文，将前端 Bug 转成 AI 编程 Agent 可领取、修复和回写的结构化缺陷。";
  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { name: "theme-color", content: "#f4f7fb" },
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
            operatingSystem: "iOS, iPadOS, macOS, Google Chrome, Web",
            browserRequirements: "Requires Safari 15.4 or Google Chrome 116 and later",
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
    cta: "选择浏览器安装",
    secondary: "登录工作台",
    viewWorkflow: "查看工作流",
    installNav: "安装扩展",
    installEyebrow: "Safari 15.4+ · Chrome 116+ · v0.1.1",
    installTitle: "在手机或电脑浏览器里，直接圈选 Bug",
    installIntro: "Safari 与 Chrome 使用同一套安全工作流。Pinhere 仅在你主动点按扩展时读取当前页面，并把选中的 DOM 与截图交给你的工作台。",
    safariBadge: "iPhone / iPad 优先",
    safariTitle: "Safari 扩展",
    safariDescription: "为触控圈选优化：手指按住预览，松开即选择。适用于 iPhone、iPad 与 Mac Safari。",
    safariDownload: "TestFlight 即将开放",
    safariMeta: "iPhone / iPad · 通过 TestFlight 安装",
    safariNotice: "iPhone 无法直接安装 ZIP。测试版通过 Apple TestFlight 分发；上线后点这里即可安装，再到“设置 → Safari → 扩展”中开启 Pinhere。",
    chromeBadge: "桌面浏览器",
    chromeTitle: "Chrome 扩展",
    chromeDescription: "适用于桌面 Chrome，支持鼠标悬停定位、DOM 圈选、截图裁剪与缺陷提交。",
    chromeDownload: "下载 Chrome 扩展",
    chromeMeta: "ZIP · 约 100 KB · Chrome 116+",
    installGuide: "Chrome 手动安装",
    installSteps: [
      ["下载并解压", "下载 ZIP 安装包，并将它解压到一个固定文件夹。"],
      ["打开扩展程序", "在地址栏输入 chrome://extensions，并开启右上角的“开发者模式”。"],
      ["加载 Pinhere", "点击“加载已解压的扩展程序”，选择刚才解压的文件夹。"]
    ],
    workflowLabel: "从页面现场到修复结果",
    nav: ["工作流", "核心能力", "常见问题"],
    steps: ["圈选 DOM", "结构化缺陷", "Agent 领取", "状态写回"],
    promise: "没有实时服务，没有仓库绑定，没有黑盒。只有一份稳定协议和可复现的缺陷上下文。",
    board: ["待处理", "处理中", "已完成"],
    featuresEyebrow: "给前端反馈一份可执行的上下文",
    featuresTitle: "从“这里不对”到 Agent 可以直接动手",
    featuresIntro: "Pinhere 是连接网页现场与代码修复流程的可视化 Bug 反馈工具。它把页面地址、DOM 元素、截图和描述收进同一份结构化缺陷，减少产品、设计、测试与开发之间的往返确认。",
    features: [
      ["精准圈选网页元素", "通过 Safari 或 Chrome 扩展直接选择出错的 DOM 元素，保留页面 URL、元素结构和可复现定位信息，不再依赖含糊的文字描述。"],
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
    cta: "Choose a browser",
    secondary: "Sign in to workspace",
    viewWorkflow: "View workflow",
    installNav: "Install extension",
    installEyebrow: "Safari 15.4+ · Chrome 116+ · v0.1.1",
    installTitle: "Point at bugs from your phone or desktop browser",
    installIntro: "Safari and Chrome share the same secure workflow. Pinhere reads the current page only when you activate the extension, then sends the selected DOM and screenshot to your workspace.",
    safariBadge: "iPhone / iPad first",
    safariTitle: "Safari extension",
    safariDescription: "Touch-first selection: hold to preview and release to choose. Built for iPhone, iPad, and Mac Safari.",
    safariDownload: "TestFlight coming soon",
    safariMeta: "iPhone / iPad · Install with TestFlight",
    safariNotice: "iPhone cannot install a ZIP directly. The beta will be distributed through Apple TestFlight; install it here, then enable Pinhere under Settings → Safari → Extensions.",
    chromeBadge: "Desktop browser",
    chromeTitle: "Chrome extension",
    chromeDescription: "For desktop Chrome, with hover targeting, DOM selection, screenshot cropping, and issue submission.",
    chromeDownload: "Download Chrome extension",
    chromeMeta: "ZIP · about 100 KB · Chrome 116+",
    installGuide: "Manual Chrome install",
    installSteps: [
      ["Download and unzip", "Download the ZIP package and extract it to a folder you can keep."],
      ["Open Extensions", "Enter chrome://extensions in the address bar and turn on Developer mode."],
      ["Load Pinhere", "Choose Load unpacked, then select the folder you just extracted."]
    ],
    workflowLabel: "From page context to shipped fix",
    nav: ["Workflow", "Capabilities", "FAQ"],
    steps: ["Select DOM", "Structure issue", "Agent claims", "Status returns"],
    promise: "No realtime service, repository binding or black box. Just a stable contract and reproducible defect context.",
    board: ["OPEN", "IN PROGRESS", "DONE"],
    featuresEyebrow: "Give frontend feedback executable context",
    featuresTitle: "From “something is wrong here” to agent-ready work",
    featuresIntro: "Pinhere is a visual bug reporting tool that connects the live webpage to the code-fixing workflow. It keeps the page URL, selected DOM element, screenshot, and description in one structured issue, cutting the back-and-forth between product, design, QA, and engineering.",
    features: [
      ["Select the exact DOM element", "Use the Safari or Chrome extension to point at the broken element and preserve its page URL, structure, and reproducible location instead of relying on vague written directions."],
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
  const chromeDownloadUrl = "/downloads/pinhere-extension-v0.1.1.zip";
  return (
    <main className="workspace-grid noise min-h-screen overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-[#d8dee4]/70 bg-[#f4f6f8]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-3 md:px-8">
        <Logo locale={locale} />
        <nav aria-label={en ? "Primary navigation" : "主导航"} className="flex items-center gap-2">
          <div className="mr-2 hidden items-center gap-1 lg:flex">
            {t.nav.map((item, index) => <a key={item} className="focus-ring rounded-lg px-3 py-2 text-xs font-medium text-[#69737c] transition-colors hover:bg-white/70 hover:text-[#171a1d]" href={["#workflow", "#capabilities", "#faq"][index]}>{item}</a>)}
          </div>
          <Link className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 py-2 font-mono text-xs text-[#69737c] hover:bg-white/70 hover:text-[#171a1d]" to={`/${en ? "zh-CN" : "en"}`}>{en ? "中文" : "EN"}</Link>
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")} to={`/${locale}/sign-in`}>{en ? "Sign in" : "登录"}</Link>
          <a className={cn(buttonVariants({ size: "sm" }), "px-3")} href="#install"><Puzzle size={15} /><span className="hidden min-[390px]:inline">{t.installNav}</span><span className="min-[390px]:hidden">{en ? "Install" : "安装"}</span></a>
        </nav>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 pt-14 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute -left-32 top-10 size-72 rounded-full border border-[#b7c4ce]/45" />
        <div className="min-w-0">
          <div className="animate-rise mb-6 inline-flex items-center gap-2 rounded-full border border-[#bfcef9] bg-[#eff6ff]/95 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[.09em] text-[#1d4ed8] sm:text-[11px] sm:tracking-[.12em]">
            <CircleDot className="shrink-0 text-[#2563eb]" size={13} /> <span className="min-w-0">{t.eyebrow}</span>
          </div>
          <h1 className="font-display animate-rise delay-1 max-w-[720px] text-[clamp(3.1rem,10vw,6.4rem)] font-bold leading-[.94] tracking-[-.055em] sm:text-[clamp(3.5rem,7.2vw,6.4rem)]">
            {t.titleA}<br /><span className="relative inline-block text-[#2563eb]">{t.titleB}<span className="absolute -bottom-1 left-1 right-0 h-[5px] -rotate-1 rounded-full bg-[#93c5fd]/80" /></span>
          </h1>
          <p className="animate-rise delay-2 mt-7 max-w-[610px] text-pretty text-base leading-7 text-[#66717a] sm:text-lg sm:leading-8">{t.body}</p>
          <div className="animate-rise delay-3 mt-8 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:flex sm:flex-wrap">
            <a className={cn(buttonVariants({ size: "lg" }), "group min-w-0 px-3 text-sm sm:w-auto sm:px-5 sm:text-base")} href="#install">{t.cta}<ArrowDown className="transition-transform group-hover:translate-y-0.5" size={18} /></a>
            <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "group min-w-0 px-3 text-sm sm:w-auto sm:px-5 sm:text-base")} to={`/${locale}/sign-in`}>{t.secondary}<ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={18} /></Link>
          </div>
          <a className="focus-ring animate-rise delay-3 mt-4 inline-flex items-center gap-1.5 rounded-md font-mono text-[11px] text-[#66717a] transition-colors hover:text-[#1d4ed8]" href="#workflow">{t.viewWorkflow}<ArrowDown size={13} /></a>
        </div>

        <div className="animate-rise delay-2 relative mx-auto min-w-0 w-full max-w-[600px] lg:mx-0">
          <div className="absolute -right-5 -top-6 -z-10 size-28 rounded-full bg-[#2563eb]/12 blur-sm" />
          <div className="absolute inset-x-4 -bottom-4 top-4 -z-10 rounded-[28px] bg-[#bfdbfe]" />
          <Card className="overflow-hidden rounded-[26px] border-[#0f172a] bg-[#0f172a] text-white shadow-[0_26px_60px_rgba(15,23,42,.22)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2"><span className="pulse-pin size-2 rounded-full bg-[#60a5fa]" /><span className="font-mono text-[11px] text-white/60">app.pinhere.dev / checkout</span></div>
              <ScanSearch size={17} className="text-white/40" />
            </div>
            <div className="relative aspect-[16/10] bg-[#1c252d] p-4 sm:aspect-[4/3] sm:p-7">
              <div className="grid h-full grid-cols-[.34fr_.66fr] gap-3 opacity-75 sm:grid-cols-[.38fr_.62fr] sm:gap-4">
                <div className="rounded-lg border border-white/10 bg-white/[.035] p-3 sm:rounded-xl sm:p-4"><div className="h-2.5 w-12 rounded-full bg-white/15 sm:h-3 sm:w-16" /><div className="mt-5 space-y-2 sm:mt-8 sm:space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-5 rounded bg-white/[.07] sm:h-7 sm:rounded-md" />)}</div></div>
                <div className="rounded-lg border border-white/10 bg-white/[.05] p-3 sm:rounded-xl sm:p-5"><div className="h-3 w-20 rounded-full bg-white/15 sm:h-4 sm:w-28" /><div className="mt-4 h-16 rounded-md bg-white/[.06] sm:mt-5 sm:h-24 sm:rounded-lg" /><div className="mt-3 h-7 rounded-md bg-white/[.08] sm:mt-4 sm:h-10 sm:rounded-lg" /></div>
              </div>
              <div className="absolute left-[44%] top-[48%] h-[20%] w-[44%] rounded-[7px] border-2 border-[#60a5fa] bg-[#2563eb]/10 shadow-[0_0_0_999px_rgba(8,12,24,.3)] sm:left-[45%] sm:h-[17%] sm:w-[43%] sm:rounded-[8px]">
                <div className="absolute -top-6 left-0 rounded-md bg-[#2563eb] px-2 py-1 font-mono text-[9px] font-medium text-white sm:-top-7 sm:text-[10px]">button.checkout</div>
                <span className="absolute -bottom-1 -right-1 size-2 rounded-full border border-[#0f172a] bg-[#60a5fa]" />
              </div>
              <MousePointer2 className="absolute bottom-[22%] right-[11%] fill-white text-[#0f172a] sm:bottom-[31%] sm:right-[12%]" size={25} />
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              {t.board.map((label, index) => <div key={label} className="border-r border-white/10 px-3 py-2.5 last:border-0 sm:px-4 sm:py-3"><div className="mb-0.5 font-mono text-[8px] text-white/50 sm:mb-1 sm:text-[9px]">0{index + 1}</div><div className="text-[11px] font-bold sm:text-xs">{label}</div></div>)}
            </div>
          </Card>
        </div>
      </section>

      <section id="install" className="scroll-mt-16 border-y border-[#cbd5e1] bg-[#eaf2ff]/82">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:px-8 lg:grid-cols-[.76fr_1.24fr] lg:gap-20 lg:py-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-5 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[.14em] text-[#1d4ed8]"><Apple size={14} />{t.installEyebrow}</div>
            <h2 className="font-display text-balance text-[clamp(2.2rem,4.7vw,4.2rem)] font-bold leading-[1] tracking-[-.05em]">{t.installTitle}</h2>
            <p className="mt-6 max-w-[570px] text-pretty text-sm leading-7 text-[#596b7c] sm:text-base">{t.installIntro}</p>
          </div>

          <div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="relative overflow-hidden rounded-[24px] border border-[#0f172a] bg-[#0f172a] p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,.16)] sm:p-7"><span className="absolute -right-12 -top-14 size-40 rounded-full border border-white/10" /><div className="relative"><div className="flex items-center justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white text-[#0f172a]"><Apple size={21} /></span><span className="rounded-full border border-[#60a5fa]/35 bg-[#2563eb]/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.08em] text-[#93c5fd]">{t.safariBadge}</span></div><h3 className="font-display mt-8 text-2xl font-bold tracking-[-.035em]">{t.safariTitle}</h3><p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-white/62">{t.safariDescription}</p><div aria-disabled="true" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-6 w-full cursor-not-allowed border-white/20 bg-white/10 text-white/65 hover:bg-white/10 hover:text-white/65")}>{t.safariDownload}<Apple size={17} /></div><div className="mt-3 font-mono text-[9px] text-white/45">{t.safariMeta}</div><p className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/52">{t.safariNotice}</p></div></article>
              <article className="rounded-[24px] border border-[#bdccdc] bg-white/82 p-6 shadow-[0_12px_36px_rgba(37,70,110,.07)] sm:p-7"><div className="flex items-center justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#e2ebf4] text-[#365667]"><Chrome size={21} /></span><span className="rounded-full border border-[#cbd8e4] bg-[#edf3f7] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.08em] text-[#587083]">{t.chromeBadge}</span></div><h3 className="font-display mt-8 text-2xl font-bold tracking-[-.035em]">{t.chromeTitle}</h3><p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-[#637485]">{t.chromeDescription}</p><a className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-6 w-full")} href={chromeDownloadUrl} download>{t.chromeDownload}<Download size={17} /></a><div className="mt-3 font-mono text-[9px] text-[#70808d]">{t.chromeMeta}</div></article>
            </div>

            <div className="mb-4 mt-10 flex items-center justify-between border-b border-[#aebed0] pb-4 font-mono text-[10px] uppercase tracking-[.13em] text-[#687b8c]"><span>{t.installGuide}</span><span>01—03</span></div>
            <ol className="grid gap-3">
              {t.installSteps.map(([title, description], index) => {
                const icons = [Download, FolderOpen, Puzzle];
                const Icon = icons[index]!;
                return <li key={title} className="group grid grid-cols-[auto_1fr] gap-x-4 rounded-2xl border border-[#c8d5e3] bg-white/76 p-5 shadow-[0_8px_26px_rgba(37,70,110,.05)] transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-[#9db3ca] hover:bg-white sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:p-6"><span className="font-mono text-[10px] text-[#2563eb]">0{index + 1}</span><div className="col-span-2 mt-4 sm:col-span-1 sm:mt-0"><h3 className="text-base font-bold tracking-[-.025em] sm:text-lg">{title}</h3><p className="mt-2 text-sm leading-6 text-[#637485]">{description}</p></div><span className="col-start-2 row-start-1 grid size-10 place-items-center justify-self-end rounded-xl bg-[#dceaff] text-[#2563eb] transition-transform group-hover:rotate-[-5deg] sm:col-start-3"><Icon aria-hidden="true" size={18} /></span></li>;
              })}
            </ol>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-16 border-y border-[#d8dee4] bg-white/70">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex items-center justify-between border-b border-[#d8dee4] px-5 py-4 font-mono text-[10px] uppercase tracking-[.12em] text-[#707a83] md:px-8">
            <span>{t.workflowLabel}</span><span>01—04</span>
          </div>
          <div className="grid md:grid-cols-4">
            {t.steps.map((step, index) => {
              const icons = [MousePointer2, ScanSearch, WandSparkles, Check];
              const Icon = icons[index]!;
              return <div key={step} className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-[#d8dee4] px-5 py-5 transition-colors last:border-b-0 hover:bg-[#edf2f5] md:grid-cols-[1fr_auto] md:gap-0 md:border-b-0 md:border-r md:p-8 md:last:border-r-0"><span className="col-start-1 row-start-1 font-mono text-[10px] text-[#747f88] md:text-[11px]">0{index + 1}</span><h2 className="col-start-2 row-start-1 text-lg font-bold tracking-[-.03em] md:col-span-2 md:col-start-1 md:row-start-2 md:mt-12 md:text-xl">{step}</h2><span className="col-start-3 row-start-1 grid size-9 place-items-center rounded-xl bg-[#e4ebef] text-[#405a69] transition-transform group-hover:rotate-[-6deg] group-hover:scale-105 md:col-start-2"><Icon aria-hidden="true" size={17} /></span></div>;
            })}
          </div>
        </div>
      </section>

      <section id="capabilities" className="scroll-mt-16 mx-auto max-w-[1280px] px-5 py-20 md:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <div>
            <div className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[.14em] text-[#2563eb]">{t.featuresEyebrow}</div>
            <h2 className="font-display text-balance text-[clamp(2.4rem,5vw,4.5rem)] font-bold leading-[.98] tracking-[-.05em]">{t.featuresTitle}</h2>
            <p className="mt-7 max-w-[580px] text-pretty text-base leading-7 text-[#66717a]">{t.featuresIntro}</p>
          </div>
          <div className="border-t border-[#7c8993]">
            {t.features.map(([title, description], index) => (
              <article key={title} className="group grid gap-4 border-b border-[#d8dee4] py-7 sm:grid-cols-[3rem_1fr] sm:py-9">
                <span className="font-mono text-[11px] text-[#2563eb]">0{index + 1}</span>
                <div><h3 className="text-xl font-bold tracking-[-.03em]">{title}</h3><p className="mt-3 max-w-[650px] text-sm leading-7 text-[#66717a]">{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#0f172a] bg-[#0f172a] text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <h2 className="font-display text-3xl font-bold tracking-[-.035em] md:text-4xl">{t.useCasesTitle}</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {t.useCases.map(([title, description], index) => <article key={title} className="rounded-2xl border border-white/12 bg-white/[.06] p-5 transition-colors hover:bg-white/[.09] sm:p-6"><div className="mb-8 font-mono text-[10px] text-white/45">0{index + 1}</div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-3 text-pretty text-sm leading-6 text-white/62">{description}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 sm:py-20 md:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-[28px] border border-[#d5dde3] bg-white p-7 shadow-[0_16px_44px_rgba(35,45,54,.07)] md:p-12"><span className="absolute -right-14 -top-16 size-52 rounded-full bg-[#e7edf2]" /><div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><p className="font-display max-w-[900px] text-[clamp(1.8rem,4vw,3.4rem)] font-semibold leading-[1.13] tracking-[-.035em]">{t.promise}</p><span className="font-mono text-[10px] uppercase tracking-[.18em] text-[#747e87]">Pinhere protocol / v1</span></div></div>
      </section>

      <section id="faq" className="scroll-mt-16 border-t border-[#d8dee4] bg-[#f8fafb]/90">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 sm:py-20 md:px-8 lg:grid-cols-[.72fr_1.28fr] lg:py-24">
          <h2 className="font-display text-balance text-[clamp(2rem,4vw,3.8rem)] font-bold leading-[1] tracking-[-.045em]">{t.faqTitle}</h2>
          <div>
            {t.faq.map(([question, answer], index) => <details key={question} className="group border-t border-[#d8dee4] py-1 last:border-b" open={index === 0}><summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-5 rounded-lg py-5 text-base font-bold tracking-[-.02em] marker:content-none sm:text-lg"><span>{question}</span><ChevronDown className="shrink-0 text-[#70808b] transition-transform group-open:rotate-180" size={19} /></summary><p className="max-w-[720px] pb-6 pr-8 text-sm leading-7 text-[#68737c]">{answer}</p></details>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d8dee4] bg-[#edf1f4]/70 px-5 py-9 md:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><Logo locale={locale} /><p className="mt-3 max-w-[620px] text-xs leading-5 text-[#73766f]">{t.footer}</p></div><div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-[#73766f]"><a className="focus-ring rounded-sm text-[#1d4ed8]" href="#install">{t.installNav}</a><a className="focus-ring rounded-sm" href="#workflow">{t.nav[0]}</a><a className="focus-ring rounded-sm" href="#capabilities">{t.nav[1]}</a><Link className="focus-ring rounded-sm" to={`/${locale}/sign-in`}>{en ? "Sign in" : "登录"}</Link></div></div>
      </footer>
    </main>
  );
}
