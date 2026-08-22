export function loader() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://pinhere.dev/zh-CN</loc><xhtml:link rel="alternate" hreflang="en" href="https://pinhere.dev/en"/><xhtml:link rel="alternate" hreflang="zh-CN" href="https://pinhere.dev/zh-CN"/><xhtml:link rel="alternate" hreflang="x-default" href="https://pinhere.dev/"/></url>
  <url><loc>https://pinhere.dev/en</loc><xhtml:link rel="alternate" hreflang="en" href="https://pinhere.dev/en"/><xhtml:link rel="alternate" hreflang="zh-CN" href="https://pinhere.dev/zh-CN"/><xhtml:link rel="alternate" hreflang="x-default" href="https://pinhere.dev/"/></url>
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
