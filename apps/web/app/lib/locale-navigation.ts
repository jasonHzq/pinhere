export type SupportedLocale = "en" | "zh-CN";

type LocationParts = {
  pathname: string;
  search?: string;
  hash?: string;
};

export function localeNavigationTarget(location: LocationParts, targetLocale: SupportedLocale) {
  const localizedPathname = /^\/(?:en|zh-CN)(?=\/|$)/.test(location.pathname)
    ? location.pathname.replace(/^\/(?:en|zh-CN)(?=\/|$)/, `/${targetLocale}`)
    : `/${targetLocale}${location.pathname.startsWith("/") ? location.pathname : `/${location.pathname}`}`;

  return `${localizedPathname}${location.search ?? ""}${location.hash ?? ""}`;
}
