export function loader() {
  const updated = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://pinhere-jasonhzqs-projects.vercel.app/zh-CN</loc><lastmod>${updated}</lastmod><xhtml:link rel="alternate" hreflang="en" href="https://pinhere-jasonhzqs-projects.vercel.app/en"/><xhtml:link rel="alternate" hreflang="zh-CN" href="https://pinhere-jasonhzqs-projects.vercel.app/zh-CN"/></url>
  <url><loc>https://pinhere-jasonhzqs-projects.vercel.app/en</loc><lastmod>${updated}</lastmod><xhtml:link rel="alternate" hreflang="en" href="https://pinhere-jasonhzqs-projects.vercel.app/en"/><xhtml:link rel="alternate" hreflang="zh-CN" href="https://pinhere-jasonhzqs-projects.vercel.app/zh-CN"/></url>
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
