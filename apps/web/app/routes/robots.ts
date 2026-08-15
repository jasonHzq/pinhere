export function loader() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /zh-CN/app\nDisallow: /en/app\nSitemap: https://pinhere-jasonhzqs-projects.vercel.app/sitemap.xml\n", {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" }
  });
}
