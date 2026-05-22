import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { JOB_SOURCE_SITES } from "./constants";

const SCHEDULED_REQUESTED_BY = "cron:job-ingestion";

/** Starts an ingestion run when the public board has few active jobs and none is already running. */
export const kickoffScheduledIngestion = internalMutation({
  args: {
    minActiveJobs: v.optional(v.number()),
    maxPagesPerSource: v.optional(v.number()),
  },
  returns: v.union(v.id("jobIngestionRuns"), v.null()),
  handler: async (ctx, args): Promise<Id<"jobIngestionRuns"> | null> => {
    const minActiveJobs = Math.max(args.minActiveJobs ?? 25, 1);
    const maxPagesPerSource = Math.min(Math.max(args.maxPagesPerSource ?? 3, 1), 10);

    const activeSample = await ctx.db
      .query("jobPostings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(minActiveJobs + 1);

    if (activeSample.length >= minActiveJobs) {
      return null;
    }

    const running = await ctx.db
      .query("jobIngestionRuns")
      .withIndex("by_started")
      .order("desc")
      .take(5);

    const hasActiveRun = running.some(
      (r) => r.status === "queued" || r.status === "running"
    );
    if (hasActiveRun) {
      return null;
    }

    const runId: Id<"jobIngestionRuns"> = await ctx.runMutation(
      internal.jobIngestion.runs.createRun,
      {
      requestedBy: SCHEDULED_REQUESTED_BY,
      sources: [...JOB_SOURCE_SITES],
      maxPagesPerSource,
      dryRun: false,
      }
    );

    await ctx.scheduler.runAfter(0, internal.jobIngestion.actions.processBatch, {
      runId,
    });

    return runId;
  },
});
