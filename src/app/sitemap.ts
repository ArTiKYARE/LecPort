import type { MetadataRoute } from "next";

const BASE = (process.env.APP_URL || "https://lecport.kos-ko.ru").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/catalog", "/subscription", "/favorites", "/login", "/register"];
  return pages.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
