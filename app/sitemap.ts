import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { absoluteUrl, getSiteOrigin } from "@/lib/siteUrl";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
  { url: absoluteUrl("/jobs"), changeFrequency: "hourly", priority: 0.9 },
  { url: absoluteUrl("/jobs/kenya"), changeFrequency: "hourly", priority: 0.85 },
  { url: absoluteUrl("/jobs/remote"), changeFrequency: "hourly", priority: 0.85 },
  { url: absoluteUrl("/employers"), changeFrequency: "weekly", priority: 0.8 },
  { url: absoluteUrl("/employers/pricing"), changeFrequency: "weekly", priority: 0.75 },
  { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.7 },
  { url: absoluteUrl("/support"), changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  getSiteOrigin();

  let jobEntries: MetadataRoute.Sitemap = [];
  try {
    const jobs = await fetchQuery(api.jobs.listPublicJobSitemapEntries, {});
    jobEntries = jobs.map((job) => ({
      url: absoluteUrl(`/jobs/${job.id}`),
      lastModified: new Date(job.lastModified),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    jobEntries = [];
  }

  return [...STATIC_ROUTES, ...jobEntries];
}
