import type { Route } from "./+types/webhook-cron";
import { processWebhookWork } from "~/lib/webhook.server";
import { releaseExpiredClaims } from "~/lib/lease.server";

export async function loader({ request }: Route.LoaderArgs) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const [webhooks, claims] = await Promise.all([processWebhookWork(), releaseExpiredClaims()]);
  return Response.json({ data: { webhooks, claims } });
}
