import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requirePlatformAdmin } from "../lib/platformAdmin";

import {
  adminSortDirectionValidator,
  jobPostingDocValidator,
  jobStatusValidatorAdmin,
  jobMetricValidator,
  organizationDocValidator,
} from "./sharedValidators";
import {
  ADMIN_LIST_SORT_CAP,
  compareStrings,
  paginateSortedArray,
  type AdminSortDirection,
} from "../lib/adminListPagination";

const jobAdminSortByValidator = v.union(
  v.literal("created"),
  v.literal("organizationName"),
  v.literal("title"),
  v.literal("status")
);

const jobStatusValidator = jobStatusValidatorAdmin;

const jobAdminSummary = v.object({
  _id: v.id("jobPostings"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  clerkOrgId: v.string(),
  title: v.string(),
  descriptionPreview: v.string(),
  location: v.string(),
  status: jobStatusValidator,
  featured: v.boolean(),
  platformHiddenAt: v.optional(v.number()),
  platformHiddenReason: v.optional(v.string()),
  viewCount: v.optional(v.number()),
  applicationCount: v.optional(v.number()),
  organizationName: v.optional(v.string()),
});

async function hydrateJobSummaries(ctx: QueryCtx, rows: Doc<"jobPostings">[]) {
  const out: Array<{
    _id: Doc<"jobPostings">["_id"];
    _creationTime: number;
    orgId: Doc<"jobPostings">["orgId"];
    clerkOrgId: string;
    title: string;
    descriptionPreview: string;
    location: string;
    status: Doc<"jobPostings">["status"];
    featured: boolean;
    platformHiddenAt?: number;
    platformHiddenReason?: string;
    viewCount?: number;
    applicationCount?: number;
    organizationName?: string;
  }> = [];
  for (const job of rows) {
    const org = await ctx.db.get(job.orgId);
    const metrics = await ctx.db
      .query("jobMetrics")
      .withIndex("by_job", (q) => q.eq("jobPostingId", job._id))
      .unique();
    out.push({
      _id: job._id,
      _creationTime: job._creationTime,
      orgId: job.orgId,
      clerkOrgId: job.clerkOrgId,
      title: job.title,
      descriptionPreview: job.description.slice(0, 200),
      location: job.location,
      status: job.status,
      featured: job.featured,
      platformHiddenAt: job.platformHiddenAt,
      platformHiddenReason: job.platformHiddenReason,
      viewCount: metrics?.viewCount,
      applicationCount: metrics?.applicationCount,
      organizationName: org?.name,
    });
  }
  return out;
}

type JobAdminSummaryRow = Awaited<ReturnType<typeof hydrateJobSummaries>>[number];

function sortJobAdminSummaries(
  rows: JobAdminSummaryRow[],
  sortBy: "created" | "organizationName" | "title" | "status",
  sortOrder: AdminSortDirection
): JobAdminSummaryRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "organizationName":
        return compareStrings(
          a.organizationName ?? "",
          b.organizationName ?? "",
          sortOrder
        );
      case "title":
        return compareStrings(a.title, b.title, sortOrder);
      case "status":
        return compareStrings(a.status, b.status, sortOrder);
      case "created":
      default:
        return sortOrder === "asc"
          ? a._creationTime - b._creationTime
          : b._creationTime - a._creationTime;
    }
  });
  return sorted;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(jobStatusValidator),
    sortBy: v.optional(jobAdminSortByValidator),
    sortOrder: v.optional(adminSortDirectionValidator),
  },
  returns: paginationResultValidator(jobAdminSummary),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const sortBy = args.sortBy ?? "created";
    const sortOrder = args.sortOrder ?? "desc";

    if (sortBy === "created") {
      if (args.status) {
        const page = await ctx.db
          .query("jobPostings")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order(sortOrder)
          .paginate(args.paginationOpts);
        const hydrated = await hydrateJobSummaries(ctx, page.page);
        return { ...page, page: hydrated };
      }

      const page = await ctx.db
        .query("jobPostings")
        .order(sortOrder)
        .paginate(args.paginationOpts);
      const hydrated = await hydrateJobSummaries(ctx, page.page);
      return { ...page, page: hydrated };
    }

    let rows: Doc<"jobPostings">[];
    if (args.status) {
      rows = await ctx.db
        .query("jobPostings")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(ADMIN_LIST_SORT_CAP);
    } else {
      rows = await ctx.db
        .query("jobPostings")
        .order("desc")
        .take(ADMIN_LIST_SORT_CAP);
    }

    const hydrated = sortJobAdminSummaries(
      await hydrateJobSummaries(ctx, rows),
      sortBy,
      sortOrder
    );
    return paginateSortedArray(hydrated, args.paginationOpts);
  },
});

export const get = query({
  args: { jobId: v.id("jobPostings") },
  returns: v.union(
    v.object({
      job: jobPostingDocValidator,
      organization: v.union(organizationDocValidator, v.null()),
      metrics: v.union(jobMetricValidator, v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const org = await ctx.db.get(job.orgId);
    const metrics = await ctx.db
      .query("jobMetrics")
      .withIndex("by_job", (q) => q.eq("jobPostingId", args.jobId))
      .unique();
    return { job, organization: org, metrics };
  },
});
