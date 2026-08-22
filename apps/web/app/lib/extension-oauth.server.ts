import { getDatabase } from "~/db/client.server";
import { extensionCodes } from "~/db/schema";
import { createSecret, digestSecret } from "~/lib/ids.server";

export function parseExtensionRedirectUri(value: string, webOrigin?: string) {
  try {
    const redirectUri = new URL(value);
    if (redirectUri.protocol === "https:" && redirectUri.hostname.endsWith(".chromiumapp.org")) return redirectUri;
    if (!webOrigin) return null;
    const origin = new URL(webOrigin);
    if (redirectUri.origin !== origin.origin || !/^\/(?:zh-CN|en)\/extension\/authorized$/.test(redirectUri.pathname)) return null;
    return redirectUri;
  } catch {
    return null;
  }
}

export async function issueExtensionAuthorizationCode(userId: string, redirectUri: URL, codeChallenge: string) {
  const code = createSecret("ph_code", 24);
  await getDatabase().insert(extensionCodes).values({
    codeDigest: digestSecret(code),
    userId,
    redirectUri: redirectUri.toString(),
    codeChallenge,
    expiresAt: new Date(Date.now() + 5 * 60_000)
  });
  redirectUri.searchParams.set("code", code);
  return redirectUri.toString();
}
