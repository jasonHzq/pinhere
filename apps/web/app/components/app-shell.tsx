import { Boxes, KanbanSquare, LogOut, Settings2 } from "lucide-react";
import { Link, NavLink, useParams } from "react-router";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/cn";

const navItems = [
  { to: "", icon: KanbanSquare, zh: "缺陷看板", shortZh: "看板", en: "Issue board", shortEn: "Board", end: true },
  { to: "projects", icon: Boxes, zh: "项目与网址", shortZh: "项目", en: "Projects & origins", shortEn: "Projects" },
  { to: "settings", icon: Settings2, zh: "自动化设置", shortZh: "自动化", en: "Automation settings", shortEn: "Automation" }
];

export function AppShell({ children, userId }: { children: React.ReactNode; userId: string }) {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const signOut = () => authClient.signOut().then(() => window.location.assign(`/${locale}`));

  return (
    <div className="workspace-grid min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#0f172a] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full border border-white/10" />
        <div className="relative flex h-full flex-col px-5 py-6">
          <div className="flex items-center justify-between">
            <Link to={`/${locale}`} className="focus-ring inline-flex min-h-11 items-center gap-2.5 rounded-xl text-[15px] font-bold tracking-[-.025em]">
              <span className="grid size-9 place-items-center rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,.15)]"><img className="size-6" src="/pinhere-mark.svg" alt="" /></span>
              PINHERE
            </Link>
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 font-mono text-[9px] tracking-[.12em] text-white/55">V1</span>
          </div>

          <div className="mt-9 rounded-2xl border border-white/10 bg-white/[.055] p-3.5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.14em] text-white/45"><span className="pulse-pin size-1.5 rounded-full bg-[#60a5fa]" />Workspace</div>
            <div className="mt-2 truncate text-sm font-semibold text-white/90">{en ? "Personal desk" : "个人工作台"}</div>
          </div>

          <nav className="mt-7 space-y-1.5" aria-label={en ? "Workspace navigation" : "工作台导航"}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                end={item.end}
                to={`/${locale}/app${item.to ? `/${item.to}` : ""}`}
                className={({ isActive }) => cn(
                  "focus-ring group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-all duration-200",
                  isActive ? "bg-white text-[#1d4ed8] shadow-[0_7px_18px_rgba(0,0,0,.12)]" : "text-white/62 hover:bg-white/8 hover:text-white"
                )}
              >
                <item.icon size={17} strokeWidth={1.8} />
                <span>{en ? item.en : item.zh}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="mb-3 truncate px-2 font-mono text-[9px] tracking-[.05em] text-white/35">{userId}</div>
            <button className="focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-white/58 transition-colors hover:bg-white/8 hover:text-white" onClick={signOut}>
              <LogOut size={15} />{en ? "Sign out" : "退出登录"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#d9e2ec]/80 bg-[#f4f7fb]/90 px-4 backdrop-blur-xl lg:hidden">
          <Link to={`/${locale}`} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold tracking-[-.025em]"><img className="size-7" src="/pinhere-mark.svg" alt="" />PINHERE</Link>
          <button title={en ? "Sign out" : "退出登录"} aria-label={en ? "Sign out" : "退出登录"} className="focus-ring icon-button text-[#68737d] hover:bg-black/5 hover:text-[#171a1d]" onClick={signOut}><LogOut size={17} /></button>
        </header>

        <div className="workspace-surface min-w-0 pb-24 lg:pb-0">{children}</div>

        <nav aria-label={en ? "Workspace navigation" : "工作台导航"} className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-2xl border border-[#cbd3da] bg-white/95 p-1.5 shadow-[0_14px_40px_rgba(32,42,51,.2)] backdrop-blur-xl lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              end={item.end}
              to={`/${locale}/app${item.to ? `/${item.to}` : ""}`}
              className={({ isActive }) => cn("focus-ring flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors", isActive ? "bg-[#eff6ff] text-[#1d4ed8]" : "text-[#64748b]")}
            >
              <item.icon size={17} strokeWidth={1.9} />
              <span className="truncate">{en ? item.shortEn : item.shortZh}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
