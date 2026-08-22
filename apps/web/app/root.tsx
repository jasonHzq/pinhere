import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useParams } from "react-router";
import { useEffect } from "react";
import stylesheet from "./styles.css?url";

const googleAnalyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim();
const validGoogleAnalyticsId = /^G-[A-Z0-9]+$/.test(googleAnalyticsId ?? "") ? googleAnalyticsId : null;

function isPublicAnalyticsRoute(pathname: string) {
  return /^\/(?:zh-CN|en)(?:\/sign-in)?\/?$/.test(pathname);
}

function GoogleAnalytics({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !validGoogleAnalyticsId) return;
    const analyticsWindow = window as Window & { dataLayer?: unknown[][] };
    const dataLayer = analyticsWindow.dataLayer ??= [];
    const gtag = (...values: unknown[]) => dataLayer.push(values);
    gtag("js", new Date());
    gtag("config", validGoogleAnalyticsId);

    if (document.getElementById("pinhere-google-tag")) return;
    const script = document.createElement("script");
    script.id = "pinhere-google-tag";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validGoogleAnalyticsId)}`;
    document.head.append(script);
  }, [enabled]);
  return null;
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
  }
];

export const meta: MetaFunction = () => [
  { title: "Pinhere — Point at the bug. Ship the fix." },
  {
    name: "description",
    content: "Capture precise UI defects from Chrome and hand structured context to your coding agent."
  },
  { name: "theme-color", content: "#f4f7fb" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { locale } = useParams();
  const { pathname } = useLocation();
  const language = locale === "en" ? "en" : "zh-CN";
  const analyticsEnabled = import.meta.env.PROD && Boolean(validGoogleAnalyticsId) && isPublicAnalyticsRoute(pathname);

  return (
    <html lang={language} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <GoogleAnalytics enabled={analyticsEnabled} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
