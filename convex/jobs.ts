import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "./_generated/dataModel";
import {
  canCustomizeHiringPipeline,
  canUseFeaturedListings,
  canUseScreeningQuestions,
} from "../lib/orgPlan";
import { buildJobSearchBlob } from "./lib/jobUtils";
import {
  activeJobEligibleForPublicSite,
  filterJobsForPublicJobBoard,
} from "./lib/jobPublicVisibility";
import { assertOrganizationNotSuspended } from "./lib/orgEmployerModeration";
import { applyJobActivationSlot } from "./lib/listingSlots";
import { resolveOrgAccessTier } from "./lib/employerBillingMode";

const jobStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("closed")
);

const locationTypeValidator = v.union(
  v.literal("onsite"),
  v.literal("remote"),
  v.literal("hybrid")
);

const employmentTypeValidator = v.union(
  v.literal("full-time"),
  v.literal("part-time"),
  v.literal("contract"),
  v.literal("internship")
);

const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("shortlisted"),
  v.literal("rejected"),
  v.literal("hired")
);

const screeningQuestionValidator = v.object({
  id: v.string(),
  prompt: v.string(),
  required: v.boolean(),
});

/** Active jobs overlapping a candidate's desired minimum salary (USD numbers as stored today). */
function jobMatchesMinSalaryFilter(
  job: {
    salaryMin?: number;
    salaryMax?: number;
  },
  candidateMinSalary: number | undefined
): boolean {
  if (candidateMinSalary === undefined) return true;
  const ceil = job.salaryMax ?? job.salaryMin;
  const floor = job.salaryMin ?? job.salaryMax;
  if (ceil !== undefined && ceil >= candidateMinSalary) return true;
  if (floor !== undefined && floor >= candidateMinSalary) return true;
  return false;
}

/** Client-side-ish filters we can't express cheaply inside search indexes alone. */
function jobMatchesSubstringFilters(args: {
  locationSubstring?: string;
  candidateMinSalary?: number;
  featuredOnly?: boolean;
}) {
  return (job: {
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    featured: boolean;
  }) => {
    if (
      args.locationSubstring &&
      !job.location.toLowerCase().includes(args.locationSubstring.toLowerCase())
    ) {
      return false;
    }
    if (!jobMatchesMinSalaryFilter(job, args.candidateMinSalary)) return false;
    if (args.featuredOnly === true && !job.featured) return false;
    return true;
  };
}

export const listActive = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    locationType: v.optional(locationTypeValidator),
    employmentType: v.optional(employmentTypeValidator),
    featuredOnly: v.optional(v.boolean()),
    locationSubstring: v.optional(v.string()),
    candidateMinSalary: v.optional(v.number()),
    prioritizeFeatured: v.optional(v.boolean()),
    sortOrder: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  handler: async (ctx, args) => {
    const sortNewestFirst = args.sortOrder !== "oldest";
    const searchTerm =
      args.search?.trim().length ? args.search!.trim() : undefined;

    const runHeavyFilterPagination = async () => {
      const cap = 500;
      const base = ctx.db
        .query("jobPostings")
        .withIndex("by_status", (qi) => qi.eq("status", "active"));
      const q = sortNewestFirst ? base.order("desc") : base.order("asc");
      const fetched = await q.take(cap);

      let rows = fetched.filter(
        jobMatchesSubstringFilters({
          locationSubstring: args.locationSubstring,
          candidateMinSalary: args.candidateMinSalary,
          featuredOnly: args.featuredOnly,
        })
      );

      if (args.locationType) {
        rows = rows.filter((j) => j.locationType === args.locationType);
      }
      if (args.employmentType) {
        rows = rows.filter((j) => j.employmentType === args.employmentType);
      }

      if (args.prioritizeFeatured) {
        rows = [...rows].sort((a, b) => {
          const f = Number(b.featured) - Number(a.featured);
          if (f !== 0) return f;
          return sortNewestFirst
            ? b._creationTime - a._creationTime
            : a._creationTime - b._creationTime;
        });
      }

      rows = await filterJobsForPublicJobBoard(ctx, rows);

      const start = Number.parseInt(args.paginationOpts.cursor ?? "0", 10) || 0;
      const pageSize = args.paginationOpts.numItems;
      const page = rows.slice(start, start + pageSize);
      const next = start + page.length;
      const isDone = next >= rows.length;
      return {
        page,
        isDone,
        continueCursor: String(next),
      };
    };

    const needsHeavyFiltering =
      (args.locationSubstring !== undefined &&
        args.locationSubstring.trim().length > 0) ||
      args.candidateMinSalary !== undefined ||
      args.featuredOnly === true ||
      args.prioritizeFeatured === true ||
      args.sortOrder === "oldest" ||
      args.locationType !== undefined ||
      args.employmentType !== undefined;

    if (needsHeavyFiltering && !searchTerm) {
      return await runHeavyFilterPagination();
    }

    const postFilterSearchPage = (pageJobs: Doc<"jobPostings">[]) => {
      let page = pageJobs.filter(
        jobMatchesSubstringFilters({
          locationSubstring: args.locationSubstring,
          candidateMinSalary: args.candidateMinSalary,
          featuredOnly: args.featuredOnly,
        })
      );
      if (args.prioritizeFeatured && page.length > 1) {
        page = [...page].sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            (sortNewestFirst
              ? b._creationTime - a._creationTime
              : a._creationTime - b._creationTime)
        );
      }
      return page;
    };

    if (searchTerm) {
      const label = searchTerm;

      let pageResult = await ctx.db
        .query("jobPostings")
        .withSearchIndex("search_blob", (q) => {
          let qq = q.search("searchBlob", label).eq("status", "active");
          if (args.locationType) {
            qq = qq.eq("locationType", args.locationType);
          }
          if (args.employmentType) {
            qq = qq.eq("employmentType", args.employmentType);
          }
          return qq;
        })
        .paginate(args.paginationOpts);

      if (pageResult.page.length === 0) {
        pageResult = await ctx.db
          .query("jobPostings")
          .withSearchIndex("search_title", (q) => {
            let qq = q.search("title", label).eq("status", "active");
            if (args.locationType) {
              qq = qq.eq("locationType", args.locationType);
            }
            if (args.employmentType) {
              qq = qq.eq("employmentType", args.employmentType);
            }
            return qq;
          })
          .paginate(args.paginationOpts);
      }

      const filteredPage = await filterJobsForPublicJobBoard(
        ctx,
        postFilterSearchPage(pageResult.page)
      );
      return {
        ...pageResult,
        page: filteredPage,
      };
    }

    const baseListing = ctx.db
      .query("jobPostings")
      .withIndex("by_status", (q) => q.eq("status", "active"));
    let dbQuery = sortNewestFirst
      ? baseListing.order("desc")
      : baseListing.order("asc");

    let pageResult = await dbQuery.paginate(args.paginationOpts);

    if (args.locationType || args.employmentType) {
      pageResult = {
        ...pageResult,
        page: pageResult.page.filter(
          (j) =>
            (!args.locationType || j.locationType === args.locationType) &&
            (!args.employmentType || j.employmentType === args.employmentType)
        ),
      };
    }

    let page = pageResult.page.filter(
      jobMatchesSubstringFilters({
        locationSubstring: args.locationSubstring,
        candidateMinSalary: args.candidateMinSalary,
        featuredOnly: args.featuredOnly,
      })
    );

    if (args.prioritizeFeatured && page.length > 0) {
      page = [...page].sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          (sortNewestFirst
            ? b._creationTime - a._creationTime
            : a._creationTime - b._creationTime)
      );
    }

    page = await filterJobsForPublicJobBoard(ctx, page);

    return { ...pageResult, page };
  },
});

/** Rule-based picks for authenticated job seekers — skills + location heuristic. */
export const listRecommended = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 30);
    if (!identity) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const skills = profile?.skills?.map((s) => s.toLowerCase()) ?? [];
    const loc = profile?.location?.toLowerCase() ?? "";

    const raw = await ctx.db
      .query("jobPostings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(200);

    const rows = await filterJobsForPublicJobBoard(ctx, raw);

    const scored = rows.map((job) => {
      let score = 0;
      const hay = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
      for (const s of skills) {
        if (s.length >= 2 && hay.includes(s)) score += 2;
      }
      if (loc.length >= 2 && job.location.toLowerCase().includes(loc)) score += 3;
      if (job.featured) score += 1;
      return { job, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.job._creationTime - a.job._creationTime;
    });

    const strong = scored.filter((x) => x.score > 0).slice(0, limit);
    if (strong.length >= limit) {
      return strong.map(({ job }) => job);
    }
    const fillers = scored
      .filter((x) => x.score === 0)
      .slice(0, limit - strong.length);
    return [...strong, ...fillers].map(({ job }) => job);
  },
});

export const getById = query({
  args: { id: v.id("jobPostings") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;

    const org = await ctx.db.get(job.orgId);
    const metrics = await ctx.db
      .query("jobMetrics")
      .withIndex("by_job", (q) => q.eq("jobPostingId", args.id))
      .unique();
    return { ...job, organization: org, metrics };
  },
});

/** Public listing page — withheld when moderated or inactive. Employers still use {@link getById}. */
export const getByIdPublic = query({
  args: { id: v.id("jobPostings") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;
    if (!(await activeJobEligibleForPublicSite(ctx, job))) return null;

    const org = await ctx.db.get(job.orgId);
    const metrics = await ctx.db
      .query("jobMetrics")
      .withIndex("by_job", (q) => q.eq("jobPostingId", args.id))
      .unique();
    return { ...job, organization: org, metrics };
  },
});

export const recordJobView = mutation({
  args: { jobPostingId: v.id("jobPostings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobPostingId);
    if (!job) return null;
    if (!(await activeJobEligibleForPublicSite(ctx, job))) return null;

    const existing = await ctx.db
      .query("jobMetrics")
      .withIndex("by_job", (q) => q.eq("jobPostingId", args.jobPostingId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewCount: existing.viewCount + 1,
      });
    } else {
      await ctx.db.insert("jobMetrics", {
        jobPostingId: args.jobPostingId,
        clerkOrgId: job.clerkOrgId,
        viewCount: 1,
        applicationCount: 0,
      });
    }

    return null;
  },
});

export const updatePipelineOrder = mutation({
  args: {
    id: v.id("jobPostings"),
    clerkOrgId: v.string(),
    pipelineOrder: v.array(applicationStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Job posting not found");
    if (job.clerkOrgId !== args.clerkOrgId) throw new Error("Access denied");

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);
    if (!canCustomizeHiringPipeline(tier)) {
      throw new Error("Custom pipeline ordering requires Pro");
    }

    const required = [
      "pending",
      "reviewed",
      "shortlisted",
      "rejected",
      "hired",
    ] as const;
    const set = new Set(args.pipelineOrder);
    if (
      args.pipelineOrder.length !== required.length ||
      !required.every((s) => set.has(s))
    ) {
      throw new Error(
        "Pipeline order must contain every hiring stage exactly once."
      );
    }

    await ctx.db.patch(args.id, { pipelineOrder: args.pipelineOrder });
    return null;
  },
});

export const listByOrg = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db
      .query("jobPostings")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .order("desc")
      .take(100);
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    locationType: locationTypeValidator,
    employmentType: employmentTypeValidator,
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    requirements: v.string(),
    screeningQuestions: v.optional(v.array(screeningQuestionValidator)),
    status: jobStatusValidator,
    featured: v.boolean(),
  },
  returns: v.id("jobPostings"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const org = await ctx.db.get(args.orgId);
    if (!org || org.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Organization not found or access denied");
    }

    if (args.status === "active") {
      assertOrganizationNotSuspended(org);
    }

    const tier = await resolveOrgAccessTier(ctx, org);

    if (args.featured && !canUseFeaturedListings(tier)) {
      throw new Error(
        "Featured listings require Hiring Pro or a legacy plan. Upgrade at /employers/pricing."
      );
    }

    if (
      args.screeningQuestions &&
      args.screeningQuestions.length > 0 &&
      !canUseScreeningQuestions(tier)
    ) {
      throw new Error(
        "Screening questions require Hiring Pro. Upgrade at /employers/pricing."
      );
    }

    let listingSlotKind: "free" | "paid" | undefined;
    if (args.status === "active") {
      listingSlotKind = await applyJobActivationSlot(
        ctx,
        org,
        args.clerkOrgId
      );
    }

    const searchBlob = buildJobSearchBlob({
      title: args.title,
      description: args.description,
      requirements: args.requirements,
    });

    return await ctx.db.insert("jobPostings", {
      orgId: args.orgId,
      clerkOrgId: args.clerkOrgId,
      title: args.title,
      description: args.description,
      location: args.location,
      locationType: args.locationType,
      employmentType: args.employmentType,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      requirements: args.requirements,
      searchBlob,
      screeningQuestions: args.screeningQuestions,
      status: args.status,
      featured: args.featured,
      ...(listingSlotKind !== undefined && { listingSlotKind }),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("jobPostings"),
    clerkOrgId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    locationType: v.optional(locationTypeValidator),
    employmentType: v.optional(employmentTypeValidator),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    requirements: v.optional(v.string()),
    screeningQuestions: v.optional(v.array(screeningQuestionValidator)),
    featured: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error("Job posting not found");
    }
    if (job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const tier = await resolveOrgAccessTier(ctx, org);

    if (args.featured === true && !canUseFeaturedListings(tier)) {
      throw new Error("Featured listings require a paid plan.");
    }

    if (
      args.screeningQuestions !== undefined &&
      args.screeningQuestions.length > 0 &&
      !canUseScreeningQuestions(tier)
    ) {
      throw new Error(
        "Screening questions require Hiring Pro. Upgrade at /employers/pricing."
      );
    }

    const { id, clerkOrgId, ...rawUpdates } = args;
    void clerkOrgId;
    const nextTitle = rawUpdates.title ?? job.title;
    const nextDescription = rawUpdates.description ?? job.description;
    const nextRequirements = rawUpdates.requirements ?? job.requirements;

    await ctx.db.patch(id, {
      ...rawUpdates,
      searchBlob: buildJobSearchBlob({
        title: nextTitle,
        description: nextDescription,
        requirements: nextRequirements,
      }),
    });
    return null;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("jobPostings"),
    clerkOrgId: v.string(),
    status: jobStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error("Job posting not found");
    }
    if (job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const tier = await resolveOrgAccessTier(ctx, org);

    let listingSlotKind = job.listingSlotKind;
    if (args.status === "active") {
      assertOrganizationNotSuspended(org);
      if (job.status !== "active") {
        listingSlotKind = await applyJobActivationSlot(
          ctx,
          org,
          args.clerkOrgId,
          args.id
        );
      }
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      ...(listingSlotKind !== undefined && { listingSlotKind }),
    });
    return null;
  },
});

export const remove = mutation({
  args: {
    id: v.id("jobPostings"),
    clerkOrgId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error("Job posting not found");
    }
    if (job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

const sitemapEntryValidator = v.object({
  id: v.id("jobPostings"),
  lastModified: v.number(),
  sourceKind: v.optional(
    v.union(v.literal("employer"), v.literal("aggregated"))
  ),
});

const publicBoardStatsValidator = v.object({
  activeTotal: v.number(),
  activeEmployer: v.number(),
  activeAggregated: v.number(),
  activeHidden: v.number(),
  activeSuspendedOrg: v.number(),
  publicBoardVisible: v.number(),
  sitemapEligible: v.number(),
});

/** Lightweight counts for SEO health checks and ops dashboards. */
export const getPublicBoardStats = query({
  args: {},
  returns: publicBoardStatsValidator,
  handler: async (ctx) => {
    const cap = 5000;
    const active = await ctx.db
      .query("jobPostings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(cap);

    let activeEmployer = 0;
    let activeAggregated = 0;
    let activeHidden = 0;
    let activeSuspendedOrg = 0;

    for (const job of active) {
      if (job.sourceKind === "aggregated") {
        activeAggregated += 1;
      } else {
        activeEmployer += 1;
      }
      if (job.platformHiddenAt !== undefined) {
        activeHidden += 1;
      }
      const org = await ctx.db.get(job.orgId);
      if (org?.platformSuspendedAt !== undefined) {
        activeSuspendedOrg += 1;
      }
    }

    const visible = await filterJobsForPublicJobBoard(ctx, active);
    const sitemapEligible = visible.filter((j) => j.sourceKind !== "aggregated").length;

    return {
      activeTotal: active.length,
      activeEmployer,
      activeAggregated,
      activeHidden,
      activeSuspendedOrg,
      publicBoardVisible: visible.length,
      sitemapEligible,
    };
  },
});

/** Active employer-posted jobs for sitemap generation (aggregated listings excluded). */
export const listPublicJobSitemapEntries = query({
  args: {},
  returns: v.array(sitemapEntryValidator),
  handler: async (ctx) => {
    const cap = 50_000;
    const rows = await ctx.db
      .query("jobPostings")
      .withIndex("by_status", (qi) => qi.eq("status", "active"))
      .order("desc")
      .take(cap);

    const visible = await filterJobsForPublicJobBoard(ctx, rows);
    const entries: Array<{
      id: Doc<"jobPostings">["_id"];
      lastModified: number;
      sourceKind: Doc<"jobPostings">["sourceKind"];
    }> = [];

    for (const job of visible) {
      if (job.sourceKind === "aggregated") continue;
      entries.push({
        id: job._id,
        lastModified: job.scrapedAt ?? job._creationTime,
        sourceKind: job.sourceKind,
      });
    }

    return entries;
  },
});
