import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/profile", "/dashboard"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
