import { query } from "./_generated/server";
import { v } from "convex/values";
import { canUseHiringAnalytics } from "../lib/orgPlan";
import { resolveOrgAccessTier } from "./lib/employerBillingMode";

export const listJobsWithMetrics = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseHiringAnalytics(tier)) {
      throw new Error("Starter or higher is required for hiring analytics");
    }

    const jobs = await ctx.db
      .query("jobPostings")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .order("desc")
      .take(100);

    return await Promise.all(
      jobs.map(async (job) => {
        const metrics = await ctx.db
          .query("jobMetrics")
          .withIndex("by_job", (q) => q.eq("jobPostingId", job._id))
          .unique();

        const applications = await ctx.db
          .query("applications")
          .withIndex("by_job", (q) => q.eq("jobPostingId", job._id))
          .collect();

        const activeApplicants = applications.filter((a) => !a.withdrawn);
        const views = metrics?.viewCount ?? 0;
        const applicantsViaMetric =
          metrics?.applicationCount ?? activeApplicants.length;

        let conversionPct: number | null = null;
        if (views > 0) {
          conversionPct =
            Math.round((applicantsViaMetric / Math.max(views, 1)) * 1000) / 10;
        }

        const stageTotals = activeApplicants.reduce(
          (acc, app) => {
            acc[app.status] = (acc[app.status] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          jobId: job._id,
          title: job.title,
          status: job.status,
          views,
          applicants: applicantsViaMetric,
          stageTotals,
          conversionPct,
          featured: job.featured,
        };
      })
    );
  },
});
