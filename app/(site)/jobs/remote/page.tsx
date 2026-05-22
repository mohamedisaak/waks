import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { absoluteUrl } from "@/lib/siteUrl";
import JobsPageClient from "../JobsPageClient";

export const metadata: Metadata = {
  title: "Remote Jobs in East Africa",
  description:
    "Find remote and work-from-home jobs for candidates based in East Africa on Waks.",
  alternates: {
    canonical: "/jobs/remote",
  },
  openGraph: {
    title: "Remote Jobs in East Africa | Waks",
    description:
      "Find remote and work-from-home jobs for candidates based in East Africa on Waks.",
    url: absoluteUrl("/jobs/remote"),
  },
};

export default async function JobsRemotePage() {
  const data = await fetchQuery(api.jobs.listActive, {
    paginationOpts: { numItems: 20, cursor: null },
    locationType: "remote",
  });

  return (
    <JobsPageClient
      defaultLocationType="remote"
      heading="Remote jobs"
      subheading="Work-from-home and distributed roles open to East Africa-based candidates."
      initialResults={data.page}
    />
  );
}
