import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { absoluteUrl } from "@/lib/siteUrl";
import JobsListingStatic from "@/components/jobs/JobsListingStatic";
import JobsPageClient from "./JobsPageClient";

export const metadata: Metadata = {
  title: "Browse Jobs in East Africa",
  description:
    "Search active job openings across Kenya, Uganda, Tanzania, and remote roles on Waks.",
  alternates: {
    canonical: "/jobs",
  },
  openGraph: {
    title: "Browse Jobs in East Africa | Waks",
    description:
      "Search active job openings across Kenya, Uganda, Tanzania, and remote roles on Waks.",
    url: absoluteUrl("/jobs"),
  },
};

export default async function JobsPage() {
  const data = await fetchQuery(api.jobs.listActive, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  return (
    <JobsPageClient
      initialResults={data.page}
      seoFallback={
        <JobsListingStatic
          jobs={data.page}
          srOnlyTitle="Latest job openings on Waks"
        />
      }
    />
  );
}
