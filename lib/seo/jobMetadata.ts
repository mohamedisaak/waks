import type { Doc } from "@/convex/_generated/dataModel";
import { absoluteUrl } from "@/lib/siteUrl";
import { isAggregatedJob, jobEmployerDisplayName } from "@/lib/aggregatedJob";

function truncate(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function jobPageTitle(job: Doc<"jobPostings">): string {
  const employer = jobEmployerDisplayName(job);
  const location = job.location?.trim();
  if (employer && location) {
    return `${job.title} — ${employer}, ${location}`;
  }
  if (employer) return `${job.title} — ${employer}`;
  if (location) return `${job.title} — ${location}`;
  return job.title;
}

export function jobPageDescription(job: Doc<"jobPostings">): string {
  const employer = jobEmployerDisplayName(job);
  const parts = [
    employer ? `${job.title} at ${employer}` : job.title,
    job.location ? `in ${job.location}` : null,
    job.employmentType ? `(${job.employmentType})` : null,
  ].filter(Boolean);
  const prefix = parts.join(" ");
  return truncate(`${prefix}. ${job.description}`, 160);
}

export function jobPagePath(id: string): string {
  return `/jobs/${id}`;
}

export function jobPageUrl(id: string): string {
  return absoluteUrl(jobPagePath(id));
}

export function jobShouldIndex(job: Doc<"jobPostings">): boolean {
  return !isAggregatedJob(job);
}

export function jobCanonicalUrl(
  job: Doc<"jobPostings">,
  id: string
): string {
  if (isAggregatedJob(job) && job.sourceListingUrl?.trim()) {
    return job.sourceListingUrl.trim();
  }
  return jobPageUrl(id);
}
