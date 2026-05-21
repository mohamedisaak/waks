import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canUseTalentPool } from "../lib/orgPlan";
import { resolveOrgAccessTier } from "./lib/employerBillingMode";

export const listTalentPool = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseTalentPool(tier)) {
      throw new Error("Pro plan required for the talent pool");
    }

    return await ctx.db
      .query("talentPoolCandidates")
      .withIndex("by_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .order("desc")
      .take(200);
  },
});

export const saveCandidate = mutation({
  args: {
    clerkOrgId: v.string(),
    applicationId: v.optional(v.id("applications")),
    note: v.optional(v.string()),
  },
  returns: v.id("talentPoolCandidates"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseTalentPool(tier)) {
      throw new Error("Pro plan required for the talent pool");
    }

    if (!args.applicationId) {
      throw new Error("Application reference required");
    }

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) {
      throw new Error("Application not available");
    }

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const existing = await ctx.db
      .query("talentPoolCandidates")
      .withIndex("by_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .collect();

    const dup = existing.find(
      (row) =>
        row.applicationId === args.applicationId ||
        (application.tokenIdentifier &&
          row.tokenIdentifier === application.tokenIdentifier)
    );

    if (dup) {
      await ctx.db.patch(dup._id, {
        note:
          args.note !== undefined ? args.note.trim() || undefined : dup.note,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        savedFromJobPostingId: job._id,
        tokenIdentifier: application.tokenIdentifier,
      });
      return dup._id;
    }

    return await ctx.db.insert("talentPoolCandidates", {
      clerkOrgId: args.clerkOrgId,
      applicationId: application._id,
      tokenIdentifier: application.tokenIdentifier,
      applicantEmail: application.applicantEmail,
      applicantName: application.applicantName,
      note: args.note?.trim(),
      savedFromJobPostingId: job._id,
    });
  },
});

export const removeTalentCandidate = mutation({
  args: {
    id: v.id("talentPoolCandidates"),
    clerkOrgId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const candidate = await ctx.db.get(args.id);
    if (!candidate || candidate.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Candidate not found");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
