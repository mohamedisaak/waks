import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export function isOrgPlatformSuspended(
  org: Doc<"organizations"> | null
): boolean {
  return org?.platformSuspendedAt !== undefined;
}

export function isJobPlatformHidden(job: Doc<"jobPostings">): boolean {
  return job.platformHiddenAt !== undefined;
}

export async function activeJobEligibleForPublicSite(
  ctx: QueryCtx | MutationCtx,
  job: Doc<"jobPostings">
): Promise<boolean> {
  if (job.status !== "active") {
    return false;
  }
  if (isJobPlatformHidden(job)) {
    return false;
  }
  const org = await ctx.db.get(job.orgId);
  if (org && isOrgPlatformSuspended(org)) {
    return false;
  }
  return true;
}

export async function filterJobsForPublicJobBoard(
  ctx: QueryCtx | MutationCtx,
  jobs: Doc<"jobPostings">[]
): Promise<Doc<"jobPostings">[]> {
  const out: Doc<"jobPostings">[] = [];
  for (const job of jobs) {
    const org = await ctx.db.get(job.orgId);
    if (isJobPlatformHidden(job)) {
      continue;
    }
    if (org && isOrgPlatformSuspended(org)) {
      continue;
    }
    out.push(job);
  }
  return out;
}
