import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import { appendAdminAudit } from "../lib/adminAudit";
import {
  ingestionRunStatusValidator,
  ingestionStatsValidator,
  jobSourceSiteValidator,
  JOB_SOURCE_SITES,
  type JobSourceSite,
} from "../jobIngestion/constants";
import { deleteAggregatedJobBatch } from "../jobIngestion/cleanup";

export const listRuns = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("jobIngestionRuns"),
      _creationTime: v.number(),
      status: ingestionRunStatusValidator,
      requestedBy: v.string(),
      sources: v.array(v.string()),
      maxPagesPerSource: v.number(),
      dryRun: v.boolean(),
      stats: ingestionStatsValidator,
      log: v.array(v.string()),
      cursor: v.optional(v.string()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    return await ctx.db
      .query("jobIngestionRuns")
      .withIndex("by_started")
      .order("desc")
      .take(limit);
  },
});

export const getRun = query({
  args: { runId: v.id("jobIngestionRuns") },
  returns: v.union(
    v.object({
      _id: v.id("jobIngestionRuns"),
      _creationTime: v.number(),
      status: ingestionRunStatusValidator,
      requestedBy: v.string(),
      sources: v.array(v.string()),
      maxPagesPerSource: v.number(),
      dryRun: v.boolean(),
      stats: ingestionStatsValidator,
      log: v.array(v.string()),
      cursor: v.optional(v.string()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    return await ctx.db.get(args.runId);
  },
});

export const startRun = mutation({
  args: {
    sources: v.array(jobSourceSiteValidator),
    maxPagesPerSource: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.id("jobIngestionRuns"),
  handler: async (ctx, args): Promise<Id<"jobIngestionRuns">> => {
    const { identity } = await requirePlatformAdmin(ctx);

    const sources =
      args.sources.length > 0
        ? args.sources
        : ([...JOB_SOURCE_SITES] as typeof args.sources);

    const maxPagesPerSource = Math.min(
      Math.max(args.maxPagesPerSource ?? 3, 1),
      10
    );

    const runId: Id<"jobIngestionRuns"> = await ctx.runMutation(
      internal.jobIngestion.runs.createRun,
      {
      requestedBy: identity.tokenIdentifier,
      sources,
      maxPagesPerSource,
      dryRun: args.dryRun ?? false,
      }
    );

    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "jobIngestion.start",
      targetTable: "jobIngestionRuns",
      targetId: runId,
      payload: { sources, maxPagesPerSource, dryRun: args.dryRun ?? false },
    });

    await ctx.scheduler.runAfter(0, internal.jobIngestion.actions.processBatch, {
      runId,
    });

    return runId;
  },
});

const ingestedCountsValidator = v.object({
  total: v.number(),
  bySource: v.record(v.string(), v.number()),
});

export const ingestedJobCounts = query({
  args: {},
  returns: ingestedCountsValidator,
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);
    const rows = await ctx.db
      .query("jobPostings")
      .filter((q) => q.eq(q.field("sourceKind"), "aggregated"))
      .collect();

    const bySource: Record<string, number> = {};
    for (const site of JOB_SOURCE_SITES) {
      bySource[site] = 0;
    }
    for (const job of rows) {
      const site = job.sourceSite;
      if (site) {
        bySource[site] = (bySource[site] ?? 0) + 1;
      }
    }

    return { total: rows.length, bySource };
  },
});

/** Permanently delete aggregated jobs from a source (batched; call until hasMore is false). */
export const removeJobsBySource = mutation({
  args: { sourceSite: jobSourceSiteValidator },
  returns: v.object({ deletedCount: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const result = await deleteAggregatedJobBatch(
      ctx,
      args.sourceSite as JobSourceSite
    );

    if (result.deletedCount > 0) {
      await appendAdminAudit(ctx, {
        actorTokenIdentifier: identity.tokenIdentifier,
        action: "jobIngestion.removeBySource",
        targetTable: "jobPostings",
        payload: {
          sourceSite: args.sourceSite,
          deletedCount: result.deletedCount,
          hasMore: result.hasMore,
        },
      });
    }

    return result;
  },
});

/** Permanently delete all aggregated jobs (batched; call until hasMore is false). */
export const removeAllIngestedJobs = mutation({
  args: {},
  returns: v.object({ deletedCount: v.number(), hasMore: v.boolean() }),
  handler: async (ctx) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const result = await deleteAggregatedJobBatch(ctx);

    if (result.deletedCount > 0) {
      await appendAdminAudit(ctx, {
        actorTokenIdentifier: identity.tokenIdentifier,
        action: "jobIngestion.removeAll",
        targetTable: "jobPostings",
        payload: {
          deletedCount: result.deletedCount,
          hasMore: result.hasMore,
        },
      });
    }

    return result;
  },
});

/** Delete ingestion run history (does not delete job postings). */
export const clearIngestionRunHistory = mutation({
  args: {},
  returns: v.object({ deletedCount: v.number() }),
  handler: async (ctx) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const running = await ctx.db
      .query("jobIngestionRuns")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "queued"),
          q.eq(q.field("status"), "running")
        )
      )
      .first();
    if (running) {
      throw new Error(
        "Cannot clear run history while an ingestion run is in progress."
      );
    }

    let deletedCount = 0;
    for (;;) {
      const rows = await ctx.db.query("jobIngestionRuns").take(200);
      if (rows.length === 0) {
        break;
      }
      for (const run of rows) {
        await ctx.db.delete(run._id);
      }
      deletedCount += rows.length;
      if (rows.length < 200) {
        break;
      }
    }

    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "jobIngestion.clearRunHistory",
      targetTable: "jobIngestionRuns",
      payload: { deletedCount },
    });

    return { deletedCount };
  },
});

/** Hide all public aggregated jobs from a given source site. */
export const hideJobsBySource = mutation({
  args: {
    sourceSite: jobSourceSiteValidator,
    reason: v.optional(v.string()),
  },
  returns: v.object({ hiddenCount: v.number() }),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const now = Date.now();
    const rows = await ctx.db
      .query("jobPostings")
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceKind"), "aggregated"),
          q.eq(q.field("sourceSite"), args.sourceSite)
        )
      )
      .take(500);

    let hiddenCount = 0;
    for (const job of rows) {
      if (job.platformHiddenAt !== undefined) continue;
      await ctx.db.patch(job._id, {
        platformHiddenAt: now,
        platformHiddenReason:
          args.reason ?? `Bulk hide source ${args.sourceSite}`,
      });
      hiddenCount += 1;
    }

    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "jobIngestion.hideBySource",
      targetTable: "jobPostings",
      payload: { sourceSite: args.sourceSite, hiddenCount },
    });

    return { hiddenCount };
  },
});
