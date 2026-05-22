import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import JobPostingJsonLd from "@/components/seo/JobPostingJsonLd";
import {
  jobCanonicalUrl,
  jobPageDescription,
  jobPagePath,
  jobPageTitle,
  jobShouldIndex,
} from "@/lib/seo/jobMetadata";
import JobDetailClient from "./JobDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await fetchQuery(api.jobs.getByIdPublic, {
    id: id as Id<"jobPostings">,
  });

  if (!job) {
    return {
      title: "Job not found",
      robots: { index: false, follow: false },
    };
  }

  const title = jobPageTitle(job);
  const description = jobPageDescription(job);
  const canonical = jobCanonicalUrl(job, id);
  const indexable = jobShouldIndex(job);

  return {
    title,
    description,
    alternates: {
      canonical: indexable ? jobPagePath(id) : canonical,
    },
    openGraph: {
      title: `${title} | Waks`,
      description,
      url: canonical,
      type: "article",
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const jobId = id as Id<"jobPostings">;

  const preloaded = await preloadQuery(api.jobs.getByIdPublic, { id: jobId });
  const job = await fetchQuery(api.jobs.getByIdPublic, { id: jobId });

  if (!job) {
    notFound();
  }

  return (
    <>
      <JobPostingJsonLd job={job} id={id} />
      <JobDetailClient id={id} preloaded={preloaded} />
    </>
  );
}
