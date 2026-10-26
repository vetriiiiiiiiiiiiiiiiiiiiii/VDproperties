import type { MetadataRoute } from "next";
import { absoluteUrl, allowIndexing } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/documents"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
