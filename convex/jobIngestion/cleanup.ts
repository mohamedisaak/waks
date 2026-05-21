import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { JobSourceSite } from "./constants";

const DELETE_BATCH_LIMIT = 200;

export async function deleteAggregatedJobPosting(
  ctx: MutationCtx,
  jobId: Id<"jobPostings">
): Promise<void> {
  const applications = await ctx.db
    .query("applications")
    .withIndex("by_job", (q) => q.eq("jobPostingId", jobId))
    .collect();

  for (const application of applications) {
    const history = await ctx.db
      .query("applicationStatusHistory")
      .withIndex("by_application", (q) =>
        q.eq("applicationId", application._id)
      )
      .collect();
    for (const entry of history) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(application._id);
  }

  const metrics = await ctx.db
    .query("jobMetrics")
    .withIndex("by_job", (q) => q.eq("jobPostingId", jobId))
    .unique();
  if (metrics) {
    await ctx.db.delete(metrics._id);
  }

  const job = await ctx.db.get(jobId);
  if (job) {
    const poolRows = await ctx.db
      .query("talentPoolCandidates")
      .withIndex("by_org", (q) => q.eq("clerkOrgId", job.clerkOrgId))
      .filter((q) => q.eq(q.field("savedFromJobPostingId"), jobId))
      .collect();
    for (const row of poolRows) {
      await ctx.db.patch(row._id, { savedFromJobPostingId: undefined });
    }
  }

  await ctx.db.delete(jobId);
}

export async function deleteAggregatedJobBatch(
  ctx: MutationCtx,
  sourceSite?: JobSourceSite
): Promise<{ deletedCount: number; hasMore: boolean }> {
  const rows = await ctx.db
    .query("jobPostings")
    .filter((q) => {
      const isAggregated = q.eq(q.field("sourceKind"), "aggregated");
      if (sourceSite === undefined) {
        return isAggregated;
      }
      return q.and(isAggregated, q.eq(q.field("sourceSite"), sourceSite));
    })
    .take(DELETE_BATCH_LIMIT);

  for (const job of rows) {
    await deleteAggregatedJobPosting(ctx, job._id);
  }

  return {
    deletedCount: rows.length,
    hasMore: rows.length === DELETE_BATCH_LIMIT,
  };
}
