import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { requirePlatformAdmin } from "../lib/platformAdmin";

type CtxForAdmin = Parameters<typeof requirePlatformAdmin>[0];

/** Convex allows one `.paginate()` per query; total doc reads ~16k cap — slice budget across KPI sources. */
const TABLE_COUNT_SCAN = 2501;
const APPLICATIONS_RECENT_SCAN = 2501;
const ACTIVE_JOBS_SCAN = 2501;

async function boundedTableCount<
  TableName extends
    | "organizations"
    | "jobPostings"
    | "users"
    | "applications",
>(ctx: CtxForAdmin, table: TableName) {
  const rows = await ctx.db.query(table).order("desc").take(TABLE_COUNT_SCAN);
  const capped = rows.length === TABLE_COUNT_SCAN;
  return { total: rows.length, capped };
}

async function applicationsSinceBounded(ctx: CtxForAdmin, sinceMs: number) {
  const rows = await ctx.db
    .query("applications")
    .order("desc")
    .take(APPLICATIONS_RECENT_SCAN);
  let count = 0;
  for (const row of rows) {
    if (row._creationTime < sinceMs) {
      break;
    }
    count++;
  }
  const hitCap = rows.length === APPLICATIONS_RECENT_SCAN;
  const oldest = rows.length > 0 ? rows[rows.length - 1]._creationTime : null;
  const capped = hitCap && oldest !== null && oldest >= sinceMs;
  return { count, capped };
}

export const kpis = query({
  args: { viewerClockMs: v.number() },
  returns: v.object({
    organizations: v.object({
      total: v.number(),
      capped: v.boolean(),
    }),
    jobs: v.object({
      total: v.number(),
      capped: v.boolean(),
    }),
    users: v.object({
      total: v.number(),
      capped: v.boolean(),
    }),
    applications: v.object({
      total: v.number(),
      capped: v.boolean(),
    }),
    applicationsLast7d: v.number(),
    applicationsLast7dCapped: v.boolean(),
    activeJobsApprox: v.number(),
    activeJobsCapped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const [orgs, jobs, users, apps] = await Promise.all([
      boundedTableCount(ctx, "organizations"),
      boundedTableCount(ctx, "jobPostings"),
      boundedTableCount(ctx, "users"),
      boundedTableCount(ctx, "applications"),
    ]);

    const weekMs = args.viewerClockMs - 7 * 24 * 60 * 60 * 1000;
    const appsWeek = await applicationsSinceBounded(ctx, weekMs);

    const activeRows = await ctx.db
      .query("jobPostings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(ACTIVE_JOBS_SCAN);

    return {
      organizations: orgs,
      jobs,
      users,
      applications: apps,
      applicationsLast7d: appsWeek.count,
      applicationsLast7dCapped: appsWeek.capped,
      activeJobsApprox: activeRows.length,
      activeJobsCapped: activeRows.length === ACTIVE_JOBS_SCAN,
    };
  },
});

const auditLogPageItem = v.object({
  _id: v.id("adminAuditLog"),
  _creationTime: v.number(),
  actorTokenIdentifier: v.optional(v.string()),
  action: v.string(),
  targetTable: v.optional(v.string()),
  targetId: v.optional(v.string()),
  payload: v.optional(v.string()),
  createdAt: v.number(),
});

export const recentAudit = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(auditLogPageItem),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    return await ctx.db
      .query("adminAuditLog")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
