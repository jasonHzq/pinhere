import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useParams } from "react-router";
import stylesheet from "./styles.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
  }
];

export const meta: MetaFunction = () => [
  { title: "Pinhere — Point at the bug. Ship the fix." },
  {
    name: "description",
    content: "Capture precise UI defects from Chrome and hand structured context to your coding agent."
  },
  { name: "theme-color", content: "#121212" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { locale } = useParams();
  const language = locale === "en" ? "en" : "zh-CN";

  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
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
