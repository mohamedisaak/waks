import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { absoluteUrl } from "@/lib/siteUrl";
import JobsPageClient from "../JobsPageClient";

export const metadata: Metadata = {
  title: "Jobs in Kenya",
  description:
    "Browse the latest job openings in Kenya — Nairobi, Mombasa, Kisumu, and remote roles on Waks.",
  alternates: {
    canonical: "/jobs/kenya",
  },
  openGraph: {
    title: "Jobs in Kenya | Waks",
    description:
      "Browse the latest job openings in Kenya — Nairobi, Mombasa, Kisumu, and remote roles on Waks.",
    url: absoluteUrl("/jobs/kenya"),
  },
};

export default async function JobsKenyaPage() {
  const data = await fetchQuery(api.jobs.listActive, {
    paginationOpts: { numItems: 20, cursor: null },
    locationSubstring: "Kenya",
  });

  return (
    <JobsPageClient
      defaultLocation="Kenya"
      heading="Jobs in Kenya"
      subheading="Open roles across Nairobi, Mombasa, Kisumu, and the rest of Kenya."
      initialResults={data.page}
    />
  );
}
