import { Boxes, KanbanSquare, LogOut, Settings2 } from "lucide-react";
import { Link, NavLink, useParams } from "react-router";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/cn";

const navItems = [
  { to: "", icon: KanbanSquare, zh: "缺陷看板", shortZh: "看板", en: "Issue board", shortEn: "Board", end: true },
  { to: "projects", icon: Boxes, zh: "项目与 Origin", shortZh: "项目", en: "Projects & origins", shortEn: "Projects" },
  { to: "settings", icon: Settings2, zh: "自动化设置", shortZh: "自动化", en: "Automation settings", shortEn: "Automation" }
];

export function AppShell({ children, userId }: { children: React.ReactNode; userId: string }) {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  return (
    <div className="workspace-grid min-h-screen lg:grid lg:grid-cols-[224px_1fr]">
      <aside className="border-b border-black/10 bg-[#151515] text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-r-black">
        <div className="flex h-full flex-col p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <Link to={`/${locale}`} className="focus-ring inline-flex items-center gap-2 rounded-lg text-[15px] font-bold tracking-[-.035em]">
              <img className="size-7 invert" src="/pinhere-mark.svg" alt="" />
              PINHERE
            </Link>
            <span className="border border-white/20 px-1.5 py-1 font-mono text-[9px] tracking-[.12em] text-white/60">V1</span>
          </div>
          <div className="mt-7 hidden border-y border-white/10 py-3 font-mono text-[9px] uppercase tracking-[.16em] text-white/45 lg:block">Workspace / personal</div>
          <nav className="mt-4 grid grid-cols-3 gap-1 lg:mt-7 lg:block lg:space-y-1">
            {navItems.map((item) => <NavLink key={item.to} end={item.end} to={`/${locale}/app${item.to ? `/${item.to}` : ""}`} className={({ isActive }) => cn("focus-ring flex min-w-0 items-center justify-center gap-2 rounded-md px-1.5 py-2.5 text-xs font-medium transition-colors lg:justify-start lg:gap-3 lg:px-3 lg:text-sm", isActive ? "bg-white !text-[#151515]" : "text-white/58 hover:bg-white/10 hover:text-white")}><item.icon size={16} strokeWidth={1.8} /><span className="truncate lg:hidden">{en ? item.shortEn : item.shortZh}</span><span className="hidden lg:inline">{en ? item.en : item.zh}</span></NavLink>)}
          </nav>
          <div className="mt-auto hidden border-t border-white/10 pt-5 lg:block">
            <div className="mb-3 truncate font-mono text-[9px] tracking-[.06em] text-white/40">{userId}</div>
            <button className="focus-ring flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-white/58 hover:bg-white/10 hover:text-white" onClick={() => authClient.signOut().then(() => window.location.assign(`/${locale}`))}><LogOut size={15} />{en ? "Sign out" : "退出登录"}</button>
          </div>
        </div>
      </aside>
      <div className="workspace-surface min-w-0">{children}</div>
    </div>
  );
}
