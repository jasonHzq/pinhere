import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  ssr: true,
  presets: [vercelPreset()],
  // Public landing pages do not depend on request-specific data. Generate them
  // at build time so Vercel can serve HTML from the CDN instead of invoking the
  // US-region function for every visit.
  prerender: ["/zh-CN", "/en"],
  // This application has a small, stable route table. Shipping it with the
  // initial document avoids a separate dynamic /__manifest request before a
  // newly visited workspace route can start loading.
  routeDiscovery: { mode: "initial" }
} satisfies Config;
