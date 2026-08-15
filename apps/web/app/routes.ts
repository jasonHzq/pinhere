import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route(".well-known/pontx.json", "routes/pontx-spec.ts"),
  route("api/v1/*", "routes/api.ts"),
  route("api/auth/*", "routes/auth-api.ts"),
  route("api/internal/cron/webhooks", "routes/webhook-cron.ts"),
  route(":locale", "routes/landing.tsx"),
  route(":locale/sign-in", "routes/sign-in.tsx"),
  route(":locale/extension/authorize", "routes/extension-authorize.tsx"),
  route(":locale/app", "routes/app-layout.tsx", [
    index("routes/board.tsx"),
    route("projects", "routes/projects.tsx"),
    route("issues/:issueId", "routes/issue-detail.tsx"),
    route("settings", "routes/settings.tsx")
  ])
] satisfies RouteConfig;
