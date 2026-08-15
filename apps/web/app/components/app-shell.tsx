import { Boxes, KanbanSquare, LogOut, Settings2 } from "lucide-react";
import { Link, NavLink, useParams } from "react-router";
import { Logo } from "./logo";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/cn";

const navItems = [
  { to: "", icon: KanbanSquare, zh: "缺陷看板", en: "Issue board", end: true },
  { to: "projects", icon: Boxes, zh: "项目与 Origin", en: "Projects & origins" },
  { to: "settings", icon: Settings2, zh: "自动化设置", en: "Automation settings" }
];

export function AppShell({ children, userId }: { children: React.ReactNode; userId: string }) {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  return (
    <div className="noise min-h-screen bg-[#f4f3ef] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-[#d6d5ce] bg-[#ebe9e2] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-4 lg:p-5">
          <div className="flex items-center justify-between"><Logo locale={locale} /><span className="rounded-md border border-[#cac9c2] bg-[#f6f5f0] px-2 py-1 font-mono text-[9px]">V1</span></div>
          <nav className="mt-5 flex gap-1 overflow-x-auto lg:mt-12 lg:block lg:space-y-1">
            {navItems.map((item) => <NavLink key={item.to} end={item.end} to={`/${locale}/app${item.to ? `/${item.to}` : ""}`} className={({ isActive }) => cn("focus-ring flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors", isActive ? "bg-[#171916] text-white shadow-[3px_3px_0_#164dd8]" : "text-[#5f635d] hover:bg-white/70 hover:text-[#171916]")}><item.icon size={17} />{en ? item.en : item.zh}</NavLink>)}
          </nav>
          <div className="mt-auto hidden border-t border-[#d6d5ce] pt-5 lg:block">
            <div className="mb-3 truncate font-mono text-[10px] text-[#787b75]">{userId}</div>
            <button className="focus-ring flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs font-semibold text-[#696d67] hover:bg-black/5" onClick={() => authClient.signOut().then(() => window.location.assign(`/${locale}`))}><LogOut size={15} />{en ? "Sign out" : "退出登录"}</button>
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
