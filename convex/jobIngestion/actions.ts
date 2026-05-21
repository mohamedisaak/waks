import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  MAX_DETAIL_FETCHES_PER_BATCH,
  SOURCE_DISPLAY_NAMES,
} from "./constants";
import type { JobSourceSite } from "./constants";
import type { IngestionCursor } from "./types";
import { scrapeJobDetail, scrapeListingPage } from "./adapters";

function parseCursor(raw: string | undefined): IngestionCursor {
  if (!raw) return { sourceIndex: 0, page: 1, urlOffset: 0 };
  try {
    const c = JSON.parse(raw) as IngestionCursor;
    return {
      sourceIndex: c.sourceIndex ?? 0,
      page: c.page ?? 1,
      urlOffset: c.urlOffset ?? 0,
    };
  } catch {
    return { sourceIndex: 0, page: 1, urlOffset: 0 };
  }
}

export const processBatch = internalAction({
  args: { runId: v.id("jobIngestionRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.runQuery(internal.jobIngestion.runs.getRunInternal, {
      runId: args.runId,
    });
    if (!run) return null;
    if (run.status === "completed" || run.status === "failed") {
      return null;
    }

    await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
      runId: args.runId,
      status: "running",
    });

    const sources = run.sources as JobSourceSite[];
    const cursor = parseCursor(run.cursor);
    const stats = { ...run.stats };

    try {
      if (cursor.sourceIndex >= sources.length) {
        await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
          runId: args.runId,
          status: "completed",
          finishedAt: Date.now(),
          logLine: "All sources processed.",
        });
        return null;
      }

      const source = sources[cursor.sourceIndex]!;
      const label = SOURCE_DISPLAY_NAMES[source] ?? source;

      await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
        runId: args.runId,
        logLine: `Scraping ${label} page ${cursor.page}…`,
      });

      const jobUrls = await scrapeListingPage(source, cursor.page);
      if (cursor.urlOffset === 0) {
        stats.found += jobUrls.length;
      }

      const toFetch = jobUrls.slice(
        cursor.urlOffset,
        cursor.urlOffset + MAX_DETAIL_FETCHES_PER_BATCH
      );
      let orgId: Id<"organizations"> | null = null;
      let clerkOrgId: string | null = null;

      if (!run.dryRun) {
        const org = await ctx.runMutation(
          internal.jobIngestion.seed.ensureAggregatorOrg,
          {}
        );
        orgId = org.orgId;
        clerkOrgId = org.clerkOrgId;
      }

      for (const url of toFetch) {
        try {
          const draft = await scrapeJobDetail(source, url);
          if (!draft) {
            stats.skipped += 1;
            continue;
          }

          if (run.dryRun || !orgId || !clerkOrgId) {
            stats.skipped += 1;
            continue;
          }

          const result: "inserted" | "updated" | "skipped" =
            await ctx.runMutation(internal.jobIngestion.upsert.upsertAggregatedJob, {
              orgId,
              clerkOrgId,
              job: draft,
            });

          if (result === "inserted") stats.inserted += 1;
          else if (result === "updated") stats.updated += 1;
          else stats.skipped += 1;
        } catch (err) {
          stats.errors += 1;
          const msg = err instanceof Error ? err.message : String(err);
          await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
            runId: args.runId,
            logLine: `Error: ${url.slice(0, 60)}… — ${msg}`,
          });
        }
      }

      const nextUrlOffset = cursor.urlOffset + toFetch.length;
      if (nextUrlOffset < jobUrls.length) {
        await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
          runId: args.runId,
          stats,
          cursor: JSON.stringify({
            sourceIndex: cursor.sourceIndex,
            page: cursor.page,
            urlOffset: nextUrlOffset,
          }),
        });
        await ctx.scheduler.runAfter(0, internal.jobIngestion.actions.processBatch, {
          runId: args.runId,
        });
        return null;
      }

      const nextPage = cursor.page + 1;
      const maxPages = run.maxPagesPerSource;

      if (nextPage <= maxPages) {
        await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
          runId: args.runId,
          stats,
          cursor: JSON.stringify({
            sourceIndex: cursor.sourceIndex,
            page: nextPage,
            urlOffset: 0,
          }),
        });
        await ctx.scheduler.runAfter(0, internal.jobIngestion.actions.processBatch, {
          runId: args.runId,
        });
        return null;
      }

      const nextSourceIndex = cursor.sourceIndex + 1;
      await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
        runId: args.runId,
        stats,
        cursor: JSON.stringify({
          sourceIndex: nextSourceIndex,
          page: 1,
          urlOffset: 0,
        }),
        logLine: `Finished ${label}.`,
      });

      if (nextSourceIndex < sources.length) {
        await ctx.scheduler.runAfter(0, internal.jobIngestion.actions.processBatch, {
          runId: args.runId,
        });
      } else {
        await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
          runId: args.runId,
          status: "completed",
          finishedAt: Date.now(),
          logLine: "Ingestion run completed.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.jobIngestion.runs.patchRun, {
        runId: args.runId,
        status: "failed",
        stats,
        finishedAt: Date.now(),
        errorMessage: msg,
        logLine: `Run failed: ${msg}`,
      });
    }

    return null;
  },
});
