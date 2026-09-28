import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://getskwad.com/", lastModified: new Date("2026-01-01") },
    { url: "https://getskwad.com/privacy", lastModified: new Date("2026-01-01") },
  ];
}
