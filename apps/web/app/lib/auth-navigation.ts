export type SupportedLocale = "en" | "zh-CN";

export function normalizeLocale(locale?: string): SupportedLocale {
  return locale === "en" ? "en" : "zh-CN";
}

export function workspacePath(locale?: string) {
  return `/${normalizeLocale(locale)}/app`;
}

export function authEntryPath(locale: string | undefined, isAuthenticated: boolean) {
  return isAuthenticated ? workspacePath(locale) : `/${normalizeLocale(locale)}/sign-in`;
}

export function safeReturnTo(value: string | null, locale?: string) {
  const fallback = workspacePath(locale);
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  const parsed = new URL(value, "https://pinhere.invalid");
  const signInPath = `/${normalizeLocale(locale)}/sign-in`;
  if (parsed.pathname === signInPath || parsed.pathname === `${signInPath}/`) return fallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
