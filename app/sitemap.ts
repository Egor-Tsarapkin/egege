import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/tasks", "/variants", "/privacy", "/consent", "/distribution-consent", "/terms"]
    .map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const }));
}
