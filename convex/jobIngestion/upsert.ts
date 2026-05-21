import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { buildJobSearchBlob } from "../lib/jobUtils";
import { jobSourceSiteValidator } from "./constants";

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

const scrapedJobValidator = v.object({
  sourceSite: jobSourceSiteValidator,
  externalJobId: v.string(),
  externalUrl: v.string(),
  sourceListingUrl: v.string(),
  applyViaSource: v.boolean(),
  title: v.string(),
  companyName: v.string(),
  location: v.string(),
  description: v.string(),
  requirements: v.string(),
  locationType: locationTypeValidator,
  employmentType: employmentTypeValidator,
  salaryMin: v.optional(v.number()),
  salaryMax: v.optional(v.number()),
});

export const upsertAggregatedJob = internalMutation({
  args: {
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
    job: scrapedJobValidator,
  },
  returns: v.union(v.literal("inserted"), v.literal("updated"), v.literal("skipped")),
  handler: async (ctx, args) => {
    const now = Date.now();
    const searchBlob = buildJobSearchBlob({
      title: args.job.title,
      description: args.job.description,
      requirements: args.job.requirements,
    });

    const existing = await ctx.db
      .query("jobPostings")
      .withIndex("by_source_and_external_id", (q) =>
        q
          .eq("sourceSite", args.job.sourceSite)
          .eq("externalJobId", args.job.externalJobId)
      )
      .unique();

    const patch = {
      title: args.job.title,
      description: args.job.description,
      location: args.job.location,
      requirements: args.job.requirements,
      locationType: args.job.locationType,
      employmentType: args.job.employmentType,
      salaryMin: args.job.salaryMin,
      salaryMax: args.job.salaryMax,
      searchBlob,
      companyName: args.job.companyName,
      externalUrl: args.job.externalUrl,
      sourceListingUrl: args.job.sourceListingUrl,
      applyViaSource: args.job.applyViaSource,
      scrapedAt: now,
      status: "active" as const,
      sourceKind: "aggregated" as const,
    };

    if (existing) {
      if (existing.sourceKind !== "aggregated") {
        return "skipped";
      }
      await ctx.db.patch(existing._id, patch);
      return "updated";
    }

    await ctx.db.insert("jobPostings", {
      orgId: args.orgId,
      clerkOrgId: args.clerkOrgId,
      title: args.job.title,
      description: args.job.description,
      location: args.job.location,
      locationType: args.job.locationType,
      employmentType: args.job.employmentType,
      salaryMin: args.job.salaryMin,
      salaryMax: args.job.salaryMax,
      requirements: args.job.requirements,
      searchBlob,
      status: "active",
      featured: false,
      sourceKind: "aggregated",
      sourceSite: args.job.sourceSite,
      externalJobId: args.job.externalJobId,
      externalUrl: args.job.externalUrl,
      sourceListingUrl: args.job.sourceListingUrl,
      applyViaSource: args.job.applyViaSource,
      companyName: args.job.companyName,
      scrapedAt: now,
    });

    return "inserted";
  },
});
