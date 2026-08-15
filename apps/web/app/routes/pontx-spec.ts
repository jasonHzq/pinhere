import { createHash } from "node:crypto";
import type { Route } from "./+types/pontx-spec";
import spec from "../../specs/spec.pontx.json";

export function loader({ request }: Route.LoaderArgs) {
  const body = JSON.stringify(spec);
  const tag = `\"${createHash("sha256").update(body).digest("base64url")}\"`;
  if (request.headers.get("if-none-match") === tag) return new Response(null, { status: 304, headers: { ETag: tag } });
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      ETag: tag
    }
  });
}
