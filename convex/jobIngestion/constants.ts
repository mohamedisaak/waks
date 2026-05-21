import { v } from "convex/values";

/** Clerk org id for platform-owned aggregated listings (not a real Clerk org). */
export const AGGREGATOR_CLERK_ORG_ID = "platform_aggregator";

export const AGGREGATOR_ORG_NAME = "Waks Job Aggregator";
export const AGGREGATOR_ORG_SLUG = "waks-aggregator";

export const INGESTION_USER_AGENT =
  "WaksJobIngestion/1.0 (+https://waks.com; platform-admin)";

export const FETCH_DELAY_MS = 1200;
export const MAX_DETAIL_FETCHES_PER_BATCH = 8;
export const MAX_LOG_LINES = 80;

export const jobSourceSiteValidator = v.union(
  v.literal("brightermonday"),
  v.literal("myjobmag"),
  v.literal("fuzu")
);

export type JobSourceSite = "brightermonday" | "myjobmag" | "fuzu";

export const JOB_SOURCE_SITES: JobSourceSite[] = [
  "brightermonday",
  "myjobmag",
  "fuzu",
];

export const SOURCE_DISPLAY_NAMES: Record<JobSourceSite, string> = {
  brightermonday: "BrighterMonday",
  myjobmag: "MyJobMag",
  fuzu: "Fuzu",
};

export const ingestionRunStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed")
);

export const ingestionStatsValidator = v.object({
  found: v.number(),
  inserted: v.number(),
  updated: v.number(),
  skipped: v.number(),
  errors: v.number(),
});

export const emptyIngestionStats = () => ({
  found: 0,
  inserted: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
});
