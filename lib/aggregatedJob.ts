import type { Doc } from "@/convex/_generated/dataModel";
import { jobHasHowToApplyInstructions } from "@/lib/jobBodySections";
import {
  SOURCE_DISPLAY_NAMES,
  type JobSourceSite,
} from "@/lib/jobIngestionSources";

export function isAggregatedJob(job: Doc<"jobPostings">): boolean {
  return job.sourceKind === "aggregated";
}

export function jobEmployerDisplayName(job: Doc<"jobPostings">): string | null {
  if (job.companyName?.trim()) return job.companyName.trim();
  return null;
}

export function aggregatedSourceLabel(job: Doc<"jobPostings">): string {
  const site = job.sourceSite as JobSourceSite | undefined;
  if (site && site in SOURCE_DISPLAY_NAMES) {
    return SOURCE_DISPLAY_NAMES[site];
  }
  return job.sourceSite ?? "original site";
}

/** When false/missing on legacy rows, default to showing aggregator attribution. */
export function shouldShowSourceAttribution(job: Doc<"jobPostings">): boolean {
  if (!isAggregatedJob(job)) return false;
  return job.applyViaSource !== false;
}

export function hasDirectApplyDestination(job: Doc<"jobPostings">): boolean {
  if (!isAggregatedJob(job) || !job.externalUrl || job.applyViaSource !== false) {
    return false;
  }
  if (job.externalUrl.startsWith("mailto:")) return true;
  if (job.sourceListingUrl && job.externalUrl === job.sourceListingUrl) {
    return false;
  }
  return true;
}

/** Hide third-party apply CTAs when the listing already explains how to apply. */
export function shouldShowAggregatedApplyCard(job: Doc<"jobPostings">): boolean {
  if (!isAggregatedJob(job) || !job.externalUrl) return false;
  if (hasDirectApplyDestination(job)) return true;
  if (jobHasHowToApplyInstructions(job.description, job.requirements)) {
    return false;
  }
  return shouldShowSourceAttribution(job);
}

export function shouldShowAggregatedApplyAttribution(
  job: Doc<"jobPostings">
): boolean {
  return (
    shouldShowSourceAttribution(job) &&
    !jobHasHowToApplyInstructions(job.description, job.requirements)
  );
}

export function aggregatedApplyHref(job: Doc<"jobPostings">): string | null {
  if (!isAggregatedJob(job) || !job.externalUrl) return null;
  return job.externalUrl;
}

export function aggregatedApplyIsEmail(job: Doc<"jobPostings">): boolean {
  return !!job.externalUrl?.startsWith("mailto:");
}

export function aggregatedApplyButtonLabel(job: Doc<"jobPostings">): string {
  if (shouldShowSourceAttribution(job)) {
    return `View & apply on ${aggregatedSourceLabel(job)}`;
  }
  if (aggregatedApplyIsEmail(job)) {
    return "Apply by email";
  }
  return "Apply now";
}

export function aggregatedApplyCardTitle(job: Doc<"jobPostings">): string {
  if (shouldShowSourceAttribution(job)) {
    return "Apply on original site";
  }
  return "Apply for this role";
}

export function aggregatedApplyCardDescription(job: Doc<"jobPostings">): string {
  if (shouldShowSourceAttribution(job)) {
    return `This role is listed on ${aggregatedSourceLabel(job)}. Waks does not accept applications for external listings.`;
  }
  if (aggregatedApplyIsEmail(job)) {
    return "Applications are handled by the employer. Use the button below to send your application by email.";
  }
  return "Applications are handled by the employer on their application page.";
}
