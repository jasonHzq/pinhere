import { ArrowUpRight, Database, Eye, LockKeyhole, MoveLeft, ShieldCheck } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link, redirect, useParams } from "react-router";
import type { Route } from "./+types/privacy";
import { Logo } from "~/components/logo";

export const meta: MetaFunction = ({ params }) => {
  const en = params.locale === "en";
  return [
    { title: en ? "Privacy Policy | Pinhere" : "隐私政策 | Pinhere" },
    { name: "description", content: en ? "How Pinhere collects, uses, stores, and protects extension and workspace data." : "了解 Pinhere 如何收集、使用、存储和保护扩展与工作区数据。" },
    { name: "robots", content: "index, follow" }
  ];
};

export function loader({ params }: Route.LoaderArgs) {
  if (params.locale !== "en" && params.locale !== "zh-CN") throw redirect("/zh-CN/privacy", { status: 301 });
  return null;
}

type PrivacyContent = {
  eyebrow: string;
  title: string;
  intro: string;
  summary: Array<[string, string]>;
  sections: Array<[string, string[]]>;
  back: string;
  support: string;
  limited: string;
};

const content: Record<"zh" | "en", PrivacyContent> = {
  zh: {
    eyebrow: "PRIVACY / 2026.08.23",
    title: "只读取你主动提交的页面现场。",
    intro: "Pinhere 是一个网页缺陷采集与 AI Coding Agent 交接工具。本政策说明 Pinhere 浏览器扩展与网页工作台如何处理数据。",
    summary: [
      ["主动触发", "扩展不会持续监控浏览。只有在你点击“圈选页面问题”并选择元素后，才会读取当前页面。"],
      ["私有存储", "截图与缺陷上下文保存在你的私有工作区，其他 Pinhere 用户无法访问。"],
      ["不售卖数据", "我们不会出售个人数据，不会将网页内容用于广告，也不会将数据用于与产品功能无关的目的。"]
    ],
    sections: [
      ["1. 我们处理哪些数据", [
        "账号数据：使用邮箱登录时的邮箱地址；使用 GitHub 登录时由 GitHub 提供的姓名、邮箱、头像与账号标识。",
        "你主动创建的缺陷：标题、描述、经敏感参数脱敏后的页面 URL、选中元素的 CSS Selector、XPath、标签、非敏感属性、有限长度的文本与 HTML、视口和元素位置。",
        "截图：仅在你主动圈选时捕获当前标签页的可见区域；你可以裁剪后再提交。",
        "自动化数据：项目配置、Issue 状态与事件、Agent 配对和运行状态、API Token 元数据、Webhook 配置与投递结果。明文 API Token 仅在创建时显示一次。",
        "技术数据：为登录、安全防护与故障排查所需的 IP 地址、浏览器 User-Agent、会话 Cookie、请求时间和有限的服务日志。公开落地页可使用 Google Analytics 统计汇总访问情况。"
      ]],
      ["2. 浏览器扩展如何工作", [
        "activeTab 与 scripting 权限只在你主动点击扩展并启动圈选后，用于在当前 HTTP/HTTPS 页面显示元素选择器。",
        "identity 权限用于打开 Pinhere 的安全授权流程；storage 权限用于在本机保存登录令牌、待提交截图和编辑状态。退出登录时会清除登录令牌。",
        "扩展不会读取浏览历史、Cookie、密码、表单输入值或后台标签页。选择元素时会移除 value、password、token、secret、session 等敏感属性。",
        "提交前，截图和页面上下文只在浏览器本地处理；点击“创建缺陷”后才通过 HTTPS 上传到 Pinhere。"
      ]],
      ["3. 我们如何使用数据", [
        "提供账号登录、项目匹配、缺陷创建、截图展示、Agent 领取与状态回写。",
        "生成公开可读但仍受工作区鉴权保护的 Issue 标识、发送你主动配置的 Webhook，以及维护服务安全和可靠性。",
        "Pinhere 对从 Google API 获得的信息的使用遵守 Chrome Web Store User Data Policy，包括 Limited Use 要求。"
      ]],
      ["4. 服务提供商与数据传输", [
        "我们仅在提供服务所必需的范围内使用基础设施提供商：Vercel（托管与私有截图存储）、Neon（数据库）、Resend（邮箱登录链接）、GitHub（可选登录）、Google Analytics（公开页面汇总分析）。",
        "为了异步生成英文可读 Issue ID，缺陷标题、最多 4,000 字符的描述、页面路径、元素标签和最多 500 字符的元素文本会发送到阿里云百炼/Qwen。截图、完整 URL、账号信息和完整 DOM 不会发送给该模型。",
        "如果你配置 Webhook，Pinhere 会将 Issue ID 和 Agent 修复提示发送到你指定的 HTTPS 地址。"
      ]],
      ["5. 保存、安全与删除", [
        "数据在提供工作区服务期间保存，并通过 HTTPS 传输。截图使用私有对象存储，访问时要求工作区鉴权。",
        "你可以删除项目、撤销 Token 和移除 Webhook。申请导出或删除账号与相关数据，请通过支持页面联系我们；我们可能保留法律、安全或防滥用所必需的最少记录。",
        "任何系统都无法保证绝对安全。如果你发现安全问题，请不要在公开 Issue 中附加秘密、令牌或个人数据。"
      ]],
      ["6. 政策更新与联系我们", [
        "我们会在数据实践发生实质变化时更新本页面和生效日期，并在需要时于产品内提供提示。",
        "隐私、数据删除或安全问题，请通过 Pinhere 支持页面联系项目维护者。"
      ]]
    ],
    back: "返回首页",
    support: "联系支持",
    limited: "Chrome Web Store Limited Use 声明"
  },
  en: {
    eyebrow: "PRIVACY / 2026.08.23",
    title: "We only read the page context you choose to submit.",
    intro: "Pinhere captures web defects and hands them to AI coding agents. This policy explains how the browser extension and web workspace handle data.",
    summary: [
      ["User initiated", "The extension does not continuously monitor browsing. It reads the current page only after you start the picker and choose an element."],
      ["Private workspace", "Screenshots and defect context are stored in your private workspace and are not available to other Pinhere users."],
      ["Never sold", "We do not sell personal data, use page content for advertising, or use it for purposes unrelated to Pinhere's functionality."]
    ],
    sections: [
      ["1. Data we process", [
        "Account data: your email address for email sign-in; or the name, email, avatar, and account identifier GitHub provides when you choose GitHub sign-in.",
        "Defects you submit: title, description, page URL with sensitive query parameters redacted, and the selected element's CSS selector, XPath, tag, non-sensitive attributes, limited text and HTML, viewport, and bounding rectangle.",
        "Screenshots: the visible area of the active tab is captured only after you start the picker. You can crop it before submission.",
        "Automation data: project configuration, issue state and events, agent pairing and run state, API token metadata, webhook configuration, and delivery results. Plaintext API tokens are shown only once at creation.",
        "Technical data: IP address, browser user agent, session cookies, request time, and limited service logs needed for authentication, security, and troubleshooting. Public landing pages may use Google Analytics for aggregate traffic measurement."
      ]],
      ["2. How the browser extension works", [
        "The activeTab and scripting permissions are used only after you activate Pinhere and start the picker, so it can display the selector on the current HTTP/HTTPS page.",
        "The identity permission opens Pinhere's secure authorization flow. The storage permission keeps sign-in tokens, pending captures, and editor state locally. Signing out removes sign-in tokens.",
        "The extension does not read browser history, cookies, passwords, form values, or background tabs. It removes attributes associated with values, passwords, tokens, secrets, and sessions from selected DOM context.",
        "Before submission, screenshots and page context are processed locally. They are transmitted to Pinhere over HTTPS only after you choose Create issue."
      ]],
      ["3. How we use data", [
        "To provide sign-in, project matching, issue creation, screenshot display, agent claiming, and status reporting.",
        "To generate readable issue identifiers, deliver webhooks you configure, and maintain the security and reliability of the service.",
        "Pinhere's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements."
      ]],
      ["4. Service providers and transfers", [
        "We use infrastructure providers only as needed to operate Pinhere: Vercel (hosting and private screenshot storage), Neon (database), Resend (email sign-in links), GitHub (optional sign-in), and Google Analytics (aggregate public-page analytics).",
        "To asynchronously generate an English readable Issue ID, the issue title, up to 4,000 characters of description, page path, element tag, and up to 500 characters of element text are sent to Alibaba Cloud Model Studio/Qwen. Screenshots, full URLs, account information, and the full DOM are not sent to the model.",
        "When you configure a webhook, Pinhere sends the Issue ID and agent repair prompt to the HTTPS endpoint you specify."
      ]],
      ["5. Retention, security, and deletion", [
        "Data is retained while needed to provide your workspace and is transmitted over HTTPS. Screenshots use private object storage and require workspace authorization to access.",
        "You can delete projects, revoke tokens, and remove webhooks. To request account export or deletion, contact us through the support page. We may retain the minimum records required for legal, security, or abuse-prevention purposes.",
        "No system can guarantee absolute security. Do not include secrets, tokens, or personal data in a public support issue."
      ]],
      ["6. Updates and contact", [
        "We will update this page and its effective date when our data practices materially change, and provide in-product notice when required.",
        "For privacy, deletion, or security questions, contact the project maintainers through Pinhere Support."
      ]]
    ],
    back: "Back home",
    support: "Contact support",
    limited: "Chrome Web Store Limited Use disclosure"
  }
};

export default function Privacy() {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const t = en ? content.en : content.zh;
  const icons = [Eye, LockKeyhole, ShieldCheck];

  return (
    <main className="workspace-grid noise min-h-screen text-[#171a1d]">
      <header className="border-b border-[#d8dee4]/80 bg-[#f4f6f8]/90">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 md:px-8">
          <Logo locale={locale} />
          <div className="flex items-center gap-2">
            <Link className="focus-ring rounded-lg px-3 py-2 font-mono text-xs text-[#69737c] hover:bg-white/75" to={`/${en ? "zh-CN" : "en"}/privacy`}>{en ? "中文" : "EN"}</Link>
            <Link className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cbd5df] bg-white/80 px-3 text-xs font-semibold" to={`/${locale}`}><MoveLeft size={14} />{t.back}</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="max-w-[880px]">
          <div className="font-mono text-[10px] font-medium tracking-[.16em] text-[#2563eb]">{t.eyebrow}</div>
          <h1 className="font-display mt-5 text-balance text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[.95] tracking-[-.055em]">{t.title}</h1>
          <p className="mt-7 max-w-[760px] text-pretty text-base leading-8 text-[#607080] sm:text-lg">{t.intro}</p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {t.summary.map(([title, description], index) => {
            const Icon = icons[index]!;
            return <article key={title} className="rounded-[22px] border border-[#cbd6e1] bg-white/78 p-5 shadow-[0_12px_34px_rgba(37,70,110,.06)]"><span className="grid size-10 place-items-center rounded-xl bg-[#e4eeff] text-[#2563eb]"><Icon size={18} /></span><h2 className="mt-6 font-display text-xl font-bold tracking-[-.035em]">{title}</h2><p className="mt-3 text-sm leading-6 text-[#667684]">{description}</p></article>;
          })}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-8 lg:self-start"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-[#607485]"><Database size={14} />Data practice</div><div className="mt-4 h-px bg-[#aebbc7]" /><p className="mt-4 text-xs leading-5 text-[#77838d]">{t.limited}</p></aside>
          <div className="border-t border-[#83929e]">
            {t.sections.map(([title, paragraphs]) => <section key={title} className="border-b border-[#d5dde4] py-8 sm:py-10"><h2 className="font-display text-2xl font-bold tracking-[-.035em] sm:text-3xl">{title}</h2><div className="mt-5 space-y-4">{paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-[#5f6f7c] sm:text-base sm:leading-8">{paragraph}</p>)}</div></section>)}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white" to={`/${locale}/support`}>{t.support}<ArrowUpRight size={16} /></Link>
          <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd5df] bg-white/80 px-4 text-sm font-semibold" to={`/${locale}`}>{t.back}</Link>
        </div>
      </section>
    </main>
  );
}
