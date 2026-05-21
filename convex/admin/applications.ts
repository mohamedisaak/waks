import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import {
  adminSortDirectionValidator,
  jobPostingDocValidator,
  organizationDocValidator,
} from "./sharedValidators";
import {
  ADMIN_LIST_SORT_CAP,
  compareStrings,
  paginateSortedArray,
  type AdminSortDirection,
} from "../lib/adminListPagination";

const applicationAdminSortByValidator = v.union(
  v.literal("created"),
  v.literal("orgName"),
  v.literal("applicantName"),
  v.literal("jobTitle"),
  v.literal("status")
);

const appStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("shortlisted"),
  v.literal("rejected"),
  v.literal("hired")
);

const applicationAdminRow = v.object({
  _id: v.id("applications"),
  _creationTime: v.number(),
  jobPostingId: v.id("jobPostings"),
  applicantName: v.string(),
  applicantEmail: v.string(),
  status: appStatusValidator,
  withdrawn: v.optional(v.boolean()),
  tokenIdentifier: v.optional(v.string()),
  jobTitle: v.optional(v.string()),
  orgName: v.optional(v.string()),
  clerkOrgId: v.optional(v.string()),
});

async function hydrateApplications(ctx: QueryCtx, rows: Doc<"applications">[]) {
  const result: Array<{
    _id: Doc<"applications">["_id"];
    _creationTime: number;
    jobPostingId: Doc<"applications">["jobPostingId"];
    applicantName: string;
    applicantEmail: string;
    status: Doc<"applications">["status"];
    withdrawn?: boolean;
    tokenIdentifier?: string;
    jobTitle?: string;
    orgName?: string;
    clerkOrgId?: string;
  }> = [];
  for (const row of rows) {
    const job = await ctx.db.get(row.jobPostingId);
    const org = job ? await ctx.db.get(job.orgId) : null;
    result.push({
      _id: row._id,
      _creationTime: row._creationTime,
      jobPostingId: row.jobPostingId,
      applicantName: row.applicantName,
      applicantEmail: row.applicantEmail,
      status: row.status,
      withdrawn: row.withdrawn,
      tokenIdentifier: row.tokenIdentifier,
      jobTitle: job?.title,
      orgName: org?.name,
      clerkOrgId: job?.clerkOrgId,
    });
  }
  return result;
}

type ApplicationAdminRow = Awaited<ReturnType<typeof hydrateApplications>>[number];

function sortApplicationAdminRows(
  rows: ApplicationAdminRow[],
  sortBy: "created" | "orgName" | "applicantName" | "jobTitle" | "status",
  sortOrder: AdminSortDirection
): ApplicationAdminRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "orgName":
        return compareStrings(a.orgName ?? "", b.orgName ?? "", sortOrder);
      case "applicantName":
        return compareStrings(a.applicantName, b.applicantName, sortOrder);
      case "jobTitle":
        return compareStrings(a.jobTitle ?? "", b.jobTitle ?? "", sortOrder);
      case "status": {
        const aStatus = a.withdrawn ? "withdrawn" : a.status;
        const bStatus = b.withdrawn ? "withdrawn" : b.status;
        return compareStrings(aStatus, bStatus, sortOrder);
      }
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
    sortBy: v.optional(applicationAdminSortByValidator),
    sortOrder: v.optional(adminSortDirectionValidator),
  },
  returns: paginationResultValidator(applicationAdminRow),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const sortBy = args.sortBy ?? "created";
    const sortOrder = args.sortOrder ?? "desc";

    if (sortBy === "created") {
      const page = await ctx.db
        .query("applications")
        .order(sortOrder)
        .paginate(args.paginationOpts);
      const hydrated = await hydrateApplications(ctx, page.page);
      return { ...page, page: hydrated };
    }

    const rows = await ctx.db
      .query("applications")
      .order("desc")
      .take(ADMIN_LIST_SORT_CAP);
    const hydrated = sortApplicationAdminRows(
      await hydrateApplications(ctx, rows),
      sortBy,
      sortOrder
    );
    return paginateSortedArray(hydrated, args.paginationOpts);
  },
});

const applicationDetailValidator = v.object({
  _id: v.id("applications"),
  _creationTime: v.number(),
  jobPostingId: v.id("jobPostings"),
  applicantName: v.string(),
  applicantEmail: v.string(),
  phone: v.optional(v.string()),
  coverLetter: v.optional(v.string()),
  resumeStorageId: v.optional(v.id("_storage")),
  tokenIdentifier: v.optional(v.string()),
  screeningAnswers: v.optional(
    v.array(
      v.object({
        questionId: v.string(),
        answer: v.string(),
      })
    )
  ),
  tags: v.optional(v.array(v.string())),
  withdrawn: v.optional(v.boolean()),
  scheduledInterviewAt: v.optional(v.number()),
  firstOpenedByEmployerAt: v.optional(v.number()),
  status: appStatusValidator,
});

export const get = query({
  args: { applicationId: v.id("applications") },
  returns: v.union(
    v.object({
      application: applicationDetailValidator,
      job: jobPostingDocValidator,
      organization: v.union(organizationDocValidator, v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const appRow = await ctx.db.get(args.applicationId);
    if (!appRow) return null;
    const job = await ctx.db.get(appRow.jobPostingId);
    if (!job) return null;
    const org = await ctx.db.get(job.orgId);
    return { application: appRow, job, organization: org ?? null };
  },
});
