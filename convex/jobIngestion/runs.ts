import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import {
  emptyIngestionStats,
  ingestionRunStatusValidator,
  ingestionStatsValidator,
  MAX_LOG_LINES,
} from "./constants";

export const getRunInternal = internalQuery({
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
    return await ctx.db.get(args.runId);
  },
});

export const patchRun = internalMutation({
  args: {
    runId: v.id("jobIngestionRuns"),
    status: v.optional(ingestionRunStatusValidator),
    stats: v.optional(ingestionStatsValidator),
    logLine: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    finishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.runId);
    if (!row) return null;

    const patch: Record<string, unknown> = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.stats !== undefined) patch.stats = args.stats;
    if (args.cursor !== undefined) {
      patch.cursor = args.cursor === null ? undefined : args.cursor;
    }
    if (args.finishedAt !== undefined) patch.finishedAt = args.finishedAt;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;

    if (args.logLine) {
      const log = [...row.log, args.logLine].slice(-MAX_LOG_LINES);
      patch.log = log;
    }

    await ctx.db.patch(args.runId, patch);
    return null;
  },
});

export const createRun = internalMutation({
  args: {
    requestedBy: v.string(),
    sources: v.array(v.string()),
    maxPagesPerSource: v.number(),
    dryRun: v.boolean(),
  },
  returns: v.id("jobIngestionRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobIngestionRuns", {
      status: "queued",
      requestedBy: args.requestedBy,
      sources: args.sources,
      maxPagesPerSource: args.maxPagesPerSource,
      dryRun: args.dryRun,
      stats: emptyIngestionStats(),
      log: [],
      startedAt: Date.now(),
    });
  },
});
