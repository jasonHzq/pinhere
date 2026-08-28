import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useMatches, useParams } from "react-router";
import frauncesLatinUrl from "@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url";
import ibmPlexSansLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2?url";
import dmMonoLatinUrl from "@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2?url";
import "./fonts.css";
import "./styles.css";

const googleAnalyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim();
const validGoogleAnalyticsId = /^G-[A-Z0-9]+$/.test(googleAnalyticsId ?? "") ? googleAnalyticsId : null;
const googleTagId = import.meta.env.VITE_GOOGLE_TAG_ID?.trim();
const validGoogleTagId = /^(?:G|GT)-[A-Z0-9]+$/.test(googleTagId ?? "") ? googleTagId : validGoogleAnalyticsId;
const workspaceNavigationSetup = "(function(){var links=document.querySelectorAll('[data-workspace-link]');var authHint=null;try{authHint=localStorage.getItem('pinhere:authenticated');}catch(error){}if(authHint==='0'){var locale=location.pathname.split('/')[1]==='en'?'en':'zh-CN';var returnTo='/'+locale+'/app';links.forEach(function(link){link.setAttribute('href','/'+locale+'/sign-in?returnTo='+encodeURIComponent(returnTo));});}document.addEventListener('click',function(event){var link=event.target instanceof Element&&event.target.closest('[data-workspace-link]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;link.setAttribute('aria-busy','true');link.setAttribute('aria-disabled','true');link.setAttribute('data-pending','true');link.classList.add('pointer-events-none','translate-y-0!','scale-[.98]','cursor-wait','border-[#93b4dc]','bg-[#eff6ff]','shadow-[0_1px_3px_rgba(15,23,42,.08)]');var spinner=document.createElement('span');spinner.className='workspace-loading-spinner';spinner.setAttribute('aria-hidden','true');var status=document.createElement('span');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=link.getAttribute('data-pending-label')||'Loading…';link.replaceChildren(spinner,status);});})();";

function isPublicAnalyticsRoute(pathname: string) {
  return /^\/(?:zh-CN|en)(?:\/sign-in)?\/?$/.test(pathname);
}

export const links: LinksFunction = () => [
  { rel: "preload", href: ibmPlexSansLatinUrl, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: frauncesLatinUrl, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: dmMonoLatinUrl, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  // Do not point at the historical /favicon.svg URL: browsers cache favicons very
  // aggressively, which is how the retired crosshair mark could still appear.
  { rel: "icon", href: "/pinhere-mark.svg?v=20260823", type: "image/svg+xml" },
  { rel: "shortcut icon", href: "/pinhere-mark.svg?v=20260823", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" }
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
  const matches = useMatches();
  const language = locale === "en" ? "en" : "zh-CN";
  const staticLandingPage = /^\/(?:zh-CN|en)\/?$/.test(pathname);
  const criticalStyles = matches
    .map((match) => (match.handle as { criticalStyles?: string } | undefined)?.criticalStyles)
    .find((styles): styles is string => Boolean(styles));
  const analyticsEnabled = import.meta.env.PROD && Boolean(validGoogleAnalyticsId) && Boolean(validGoogleTagId) && isPublicAnalyticsRoute(pathname);
  const googleTagSetup = analyticsEnabled
    ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(validGoogleTagId)});`
    : null;
  const publicEventSetup = analyticsEnabled
    ? "document.addEventListener('click',function(event){var target=event.target instanceof Element&&event.target.closest('[data-analytics-event]');if(!target||typeof window.gtag!=='function')return;window.gtag('event',target.getAttribute('data-analytics-event'),{placement:target.getAttribute('data-analytics-placement')||undefined,method:target.getAttribute('data-analytics-method')||undefined});});"
    : null;
  // Analytics is useful, but it must not compete with the application shell.
  // Queue events immediately and fetch Google's script only after the page has
  // finished loading and the browser has idle time.
  const googleTagLoader = analyticsEnabled
    ? `(function(){var start=function(){var script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validGoogleTagId!)}';document.head.appendChild(script);};var idle=function(){if('requestIdleCallback'in window){window.requestIdleCallback(start,{timeout:3000});}else{window.setTimeout(start,1500);}};if(document.readyState==='complete'){idle();}else{window.addEventListener('load',idle,{once:true});}})();`
    : null;

  return (
    <html lang={language} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {criticalStyles && <style data-critical-styles="landing" dangerouslySetInnerHTML={{ __html: criticalStyles }} />}
        {googleTagSetup && <script dangerouslySetInnerHTML={{ __html: googleTagSetup }} />}
        {publicEventSetup && <script dangerouslySetInnerHTML={{ __html: publicEventSetup }} />}
        {googleTagLoader && <script dangerouslySetInnerHTML={{ __html: googleTagLoader }} />}
        <Meta />
        {staticLandingPage ? (
          <>
            <link rel="icon" href="/pinhere-mark.svg?v=20260823" type="image/svg+xml" />
            <link rel="shortcut icon" href="/pinhere-mark.svg?v=20260823" type="image/svg+xml" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/site.webmanifest" />
          </>
        ) : (
          <Links />
        )}
      </head>
      <body>
        {children}
        {staticLandingPage ? (
          <script dangerouslySetInnerHTML={{ __html: workspaceNavigationSetup }} />
        ) : (
          <>
            <ScrollRestoration />
            <Scripts />
          </>
        )}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
