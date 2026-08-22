import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useParams } from "react-router";
import stylesheet from "./styles.css?url";

const googleAnalyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim();
const validGoogleAnalyticsId = /^G-[A-Z0-9]+$/.test(googleAnalyticsId ?? "") ? googleAnalyticsId : null;

function isPublicAnalyticsRoute(pathname: string) {
  return /^\/(?:zh-CN|en)(?:\/sign-in)?\/?$/.test(pathname);
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
  const googleTagSetup = analyticsEnabled
    ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(validGoogleAnalyticsId)});`
    : null;

  return (
    <html lang={language} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {analyticsEnabled && <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validGoogleAnalyticsId!)}`} />}
        {googleTagSetup && <script dangerouslySetInnerHTML={{ __html: googleTagSetup }} />}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
