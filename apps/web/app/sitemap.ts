import type { MetadataRoute } from "next";
import { seo } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = seo.siteUrl;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
