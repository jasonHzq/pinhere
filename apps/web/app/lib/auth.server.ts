import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, oAuthProxy } from "better-auth/plugins";
import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDatabase } from "~/db/client.server";
import {
  authAccounts,
  attachments,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications
} from "~/db/schema";

function createPinhereAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");

  const publicBaseURL = process.env.PINHERE_BASE_URL ?? "http://localhost:5173";
  const legacyOAuthCallbackURL = process.env.PINHERE_OAUTH_PROXY_URL;
  const publicOrigin = new URL(publicBaseURL);
  const legacyOAuthOrigin = legacyOAuthCallbackURL ? new URL(legacyOAuthCallbackURL) : null;
  const baseURL = legacyOAuthOrigin
    ? {
        allowedHosts: [publicOrigin.host, legacyOAuthOrigin.host],
        protocol: publicOrigin.protocol.replace(":", "") as "http" | "https",
        fallback: publicOrigin.origin
      }
    : publicBaseURL;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  return betterAuth({
    appName: "Pinhere",
    baseURL,
    secret,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
        rateLimit: authRateLimits
      }
    }),
    rateLimit: { enabled: true, storage: "database" },
    socialProviders: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          }
        }
      : {},
    // GitHub OAuth Apps accept a single callback URL. During the domain migration,
    // the legacy Vercel hostname receives GitHub's callback and Better Auth's
    // encrypted proxy hands the signed-in session back to the public domain.
    plugins: [
      magicLink({
        expiresIn: 10 * 60,
        sendMagicLink: async ({ email, url }) => {
          if (!resend) {
            if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is required");
            console.info(`[pinhere] Magic link for ${email}: ${url}`);
            return;
          }
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? "Pinhere <auth@pinhere.dev>",
            to: email,
            subject: "Sign in to Pinhere",
            html: `<p>Open this one-time link to sign in to Pinhere:</p><p><a href=\"${url}\">Sign in</a></p><p>This link expires in 10 minutes.</p>`
          });
        }
      }),
      ...(legacyOAuthOrigin ? [oAuthProxy({ productionURL: legacyOAuthOrigin.origin })] : [])
    ],
    databaseHooks: {
      user: {
        delete: {
          before: async (user) => {
            if (!process.env.BLOB_READ_WRITE_TOKEN) return;
            const blobs = await getDatabase().select({ url: attachments.blobUrl }).from(attachments).where(eq(attachments.userId, user.id));
            const urls = blobs.map((item) => item.url).filter((url) => !url.startsWith("data:"));
            if (urls.length) await del(urls);
          }
        }
      }
    },
    advanced: { database: { generateId: () => crypto.randomUUID() } }
  });
}

let instance: ReturnType<typeof createPinhereAuth> | undefined;

export function getAuth(): ReturnType<typeof createPinhereAuth> {
  instance ??= createPinhereAuth();
  return instance;
}
