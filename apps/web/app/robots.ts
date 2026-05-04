import type { MetadataRoute } from "next";
import { seo } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = seo.siteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/auth/",
          "/api/",
          "/errors/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
