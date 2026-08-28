import { Boxes, Cable, KanbanSquare, Languages, LoaderCircle, LogOut, Menu, PanelLeftClose, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PrefetchPageLinks, useFetcher, useLocation, useNavigate, useNavigation, useParams } from "react-router";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  useAnimatedSidebar
} from "~/components/motion/animated-sidebar";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/cn";
import { localeNavigationTarget, type SupportedLocale } from "~/lib/locale-navigation";
import { BrandMark, Logo } from "./logo";

const navItems = [
  { to: "", icon: KanbanSquare, index: "01", zh: "缺陷看板", en: "Issue board" },
  { to: "projects", icon: Boxes, index: "02", zh: "我的项目", en: "My projects" },
  { to: "agent", icon: Cable, index: "03", zh: "Agent 接入", en: "Agent setup" },
  { to: "settings", icon: Settings2, index: "04", zh: "自动化设置", en: "Automation settings" }
];

function SidebarToggle({ en }: { en: boolean }) {
  const sidebar = useAnimatedSidebar();
  const expanded = sidebar.isMobile ? sidebar.openMobile : sidebar.state === "expanded";
  return (
    <AnimatedSidebarTrigger
      className="text-[#738096] transition-colors hover:bg-[#eef3fb] hover:text-[#0f172a]"
      aria-label={expanded ? (en ? "Collapse navigation" : "收起导航") : (en ? "Expand navigation" : "展开导航")}
    >
      {expanded ? <PanelLeftClose size={17} /> : <BrandMark className="size-8" />}
    </AnimatedSidebarTrigger>
  );
}

function WorkspaceNavigationItem({
  active,
  badge,
  children,
  icon,
  indexRoute,
  onSelect,
  warm,
  to
}: {
  active: boolean;
  badge: React.ReactNode;
  children: React.ReactNode;
  icon: React.ReactNode;
  indexRoute?: boolean;
  onSelect: () => void;
  warm: boolean;
  to: string;
}) {
  const [prefetch, setPrefetch] = useState(false);
  const routeWarmer = useFetcher();
  const warmedRoute = useRef("");
  const beginPrefetch = () => setPrefetch(true);

  useEffect(() => {
    const target = indexRoute ? `${to}?index` : to;
    if (!warm || active || warmedRoute.current === target) return;
    warmedRoute.current = target;
    void routeWarmer.load(target);
  }, [active, indexRoute, routeWarmer, to, warm]);

  return (
    <AnimatedSidebarMenuItem
      onFocusCapture={beginPrefetch}
      onMouseEnter={beginPrefetch}
      onPointerDown={beginPrefetch}
    >
      <AnimatedSidebarMenuButton
        icon={icon}
        badge={badge}
        isActive={active}
        closeOnSelect
        onSelect={onSelect}
        className={cn("min-h-12 rounded-xl px-3 text-[#66758a] hover:text-[#172033] focus-visible:bg-[#e8effb]", active && "font-bold text-[#1d4ed8]")}
      >
        {children}
      </AnimatedSidebarMenuButton>
      {(warm || prefetch) && !active ? <PrefetchPageLinks page={to} /> : null}
    </AnimatedSidebarMenuItem>
  );
}

export function AppShell({ children, userId }: { children: React.ReactNode; userId: string }) {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const navigating = navigation.state !== "idle";
  const [signingOut, setSigningOut] = useState(false);
  const [warmRoutes, setWarmRoutes] = useState(false);
  const targetLocale: SupportedLocale = en ? "zh-CN" : "en";
  const languageTarget = localeNavigationTarget(location, targetLocale);
  const languageLabel = en ? "Switch to Chinese" : "切换到英文";
  const languageName = en ? "中文" : "English";

  useEffect(() => {
    try {
      localStorage.setItem("pinhere:authenticated", "1");
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  }, []);

  useEffect(() => {
    // Once the current route is interactive, quietly warm the other two route
    // modules and their loader data. Intent prefetch remains as the fast path
    // for users who click before this short idle window.
    const timer = window.setTimeout(() => setWarmRoutes(true), 400);
    return () => window.clearTimeout(timer);
  }, [locale]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authClient.signOut();
      try {
        localStorage.setItem("pinhere:authenticated", "0");
      } catch {
        // Navigation still completes when storage is unavailable.
      }
      window.location.assign(`/${locale}`);
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <AnimatedSidebarProvider
      className="workspace-grid"
      style={{ "--sidebar-width": "16.75rem", "--sidebar-width-icon": "4.75rem", "--sidebar-width-mobile": "19rem" }}
    >
      <div className={cn("navigation-progress", navigating && "is-active")} aria-hidden="true"><span /></div>
      <div className="sr-only" role="status" aria-live="polite">{navigating ? (en ? "Loading page" : "页面加载中") : ""}</div>

      <AnimatedSidebar
        ariaLabel={en ? "Workspace navigation" : "工作台导航"}
        collapsible="icon"
        className="border-[#d9e2ec] bg-[#fbfcfe] text-[#0f172a]"
        panelClassName="border-[#d9e2ec] bg-[#fbfcfe] text-[#0f172a] [--color-muted:#e8effb] [--color-muted-foreground:#66758a] [--color-ring:#2563eb]"
      >
        <AnimatedSidebarHeader className="relative gap-5 border-b border-[#e4eaf1] px-4 pb-5 pt-5">
          <div className="flex min-h-11 items-center justify-between gap-2 group-data-[state=collapsed]/sidebar-wrapper:justify-center">
            <div className="min-w-0 overflow-hidden group-data-[state=collapsed]/sidebar-wrapper:hidden"><Logo locale={locale} className="whitespace-nowrap" /></div>
            <SidebarToggle en={en} />
          </div>
          <div className="flex items-end justify-between gap-3 px-1 transition-opacity group-data-[state=collapsed]/sidebar-wrapper:pointer-events-none group-data-[state=collapsed]/sidebar-wrapper:h-0 group-data-[state=collapsed]/sidebar-wrapper:overflow-hidden group-data-[state=collapsed]/sidebar-wrapper:opacity-0">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.16em] text-[#8a97a9]">Workspace</div>
              <div className="mt-1.5 truncate text-sm font-bold tracking-[-.02em] text-[#1b2638]">{en ? "Personal desk" : "个人工作台"}</div>
            </div>
            <span className="mb-0.5 inline-flex items-center gap-1.5 rounded-full bg-[#edf4ff] px-2 py-1 font-mono text-[8px] font-medium uppercase tracking-[.08em] text-[#1d4ed8]"><span className="pulse-pin size-1.5 rounded-full bg-[#2563eb]" />Live</span>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent className="relative px-3 py-5">
          <AnimatedSidebarGroup className="px-0 py-0">
            <AnimatedSidebarGroupLabel className="mb-2 text-[#96a1b0]">{en ? "Navigate" : "工作区导航"}</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu className="gap-2">
                {navItems.map((item) => {
                  const to = `/${locale}/app${item.to ? `/${item.to}` : ""}`;
                  const active = item.to ? location.pathname.startsWith(to) : location.pathname === to || location.pathname === `${to}/`;
                  return (
                    <WorkspaceNavigationItem
                      key={item.to}
                      active={active}
                      badge={<span className={cn("font-mono text-[9px] tracking-[.08em]", active ? "text-[#2563eb]" : "text-[#a0aaba]")}>{item.index}</span>}
                      icon={<item.icon size={17} strokeWidth={1.8} />}
                      indexRoute={!item.to}
                      onSelect={() => navigate(to, { viewTransition: true })}
                      warm={warmRoutes && !navigating}
                      to={to}
                    >
                      {en ? item.en : item.zh}
                    </WorkspaceNavigationItem>
                  );
                })}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="relative border-[#e4eaf1] px-3 pb-4 pt-3">
          <button
            type="button"
            aria-label={languageLabel}
            title={languageLabel}
            className="focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold text-[#728096] transition-colors hover:bg-[#eef3fb] hover:text-[#172033] group-data-[state=collapsed]/sidebar-wrapper:justify-center"
            onClick={() => navigate(languageTarget, { preventScrollReset: true, viewTransition: true })}
          >
            <Languages className="shrink-0" size={16} />
            <span className="truncate group-data-[state=collapsed]/sidebar-wrapper:hidden">{languageName}</span>
          </button>
          <div className="px-2 group-data-[state=collapsed]/sidebar-wrapper:hidden">
            <div className="font-mono text-[8px] uppercase tracking-[.14em] text-[#9aa5b4]">{en ? "Signed in" : "当前账号"}</div>
            <div title={userId} className="mt-1 truncate text-[11px] font-medium text-[#66758a]">{userId}</div>
          </div>
          <button
            disabled={signingOut}
            aria-busy={signingOut || undefined}
            className="focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold text-[#728096] transition-colors hover:bg-[#eef3fb] hover:text-[#172033] disabled:opacity-55"
            onClick={() => void signOut()}
          >
            {signingOut ? <LoaderCircle className="shrink-0 animate-spin" size={15} /> : <LogOut className="shrink-0" size={15} />}
            <span className="truncate group-data-[state=collapsed]/sidebar-wrapper:hidden">{signingOut ? (en ? "Signing out…" : "正在退出…") : en ? "Sign out" : "退出登录"}</span>
          </button>
        </AnimatedSidebarFooter>
        <AnimatedSidebarRail aria-label={en ? "Toggle navigation" : "展开或收起导航"} />
      </AnimatedSidebar>

      <AnimatedSidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-[#d9e2ec]/80 bg-[#f4f7fb]/97 px-4 md:hidden">
          <AnimatedSidebarTrigger className="focus-ring text-[#526277] hover:bg-black/5" aria-label={en ? "Open navigation" : "打开导航"}><Menu size={19} /></AnimatedSidebarTrigger>
          <Logo locale={locale} className="gap-2 text-sm [&_img]:size-7" />
          <div className="flex items-center justify-self-end gap-1">
            <button type="button" aria-label={languageLabel} title={languageLabel} className="focus-ring icon-button gap-1 text-[#68737d] hover:bg-black/5 hover:text-[#171a1d]" onClick={() => navigate(languageTarget, { preventScrollReset: true, viewTransition: true })}>
              <Languages size={16} />
              <span className="font-mono text-[9px] font-medium">{en ? "中" : "EN"}</span>
            </button>
            <button title={en ? "Sign out" : "退出登录"} aria-label={en ? "Sign out" : "退出登录"} disabled={signingOut} className="focus-ring icon-button text-[#68737d] hover:bg-black/5 hover:text-[#171a1d] disabled:opacity-45" onClick={() => void signOut()}>{signingOut ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}</button>
          </div>
        </header>
        <div className="workspace-surface min-w-0">{children}</div>
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  );
}
