import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL || "https://lecport.kos-ko.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/cabinet"] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
