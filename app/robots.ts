import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/jobs", "/employers", "/support", "/about", "/terms", "/privacy"],
        disallow: [
          "/dashboard",
          "/admin",
          "/sign-in",
          "/sign-up",
          "/profile",
          "/my-applications",
          "/onboarding",
          "/server",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
