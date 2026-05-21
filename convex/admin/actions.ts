import { mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  requirePlatformAdmin,
  bootstrapPlatformAdminClerkIds,
} from "../lib/platformAdmin";
import { appendAdminAudit } from "../lib/adminAudit";

const planValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("pro")
);

const billingValidator = v.union(
  v.literal("clerk_stripe"),
  v.literal("mpesa")
);

export const suspendOrganization = mutation({
  args: {
    orgId: v.id("organizations"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.orgId);
    if (!row) {
      throw new Error("Organization not found");
    }
    await ctx.db.patch(args.orgId, {
      platformSuspendedAt: Date.now(),
      platformSuspendedReason: args.reason,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "org.suspend",
      targetTable: "organizations",
      targetId: args.orgId,
      payload: { reason: args.reason },
    });
    return null;
  },
});

export const unsuspendOrganization = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.orgId);
    if (!row) {
      throw new Error("Organization not found");
    }
    await ctx.db.patch(args.orgId, {
      platformSuspendedAt: undefined,
      platformSuspendedReason: undefined,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "org.unsuspend",
      targetTable: "organizations",
      targetId: args.orgId,
    });
    return null;
  },
});

/** Force Convex org record to Free tier (Clears expiry / billing provider). Clerk subscriptions may still need cancellation separately. */
export const downgradeOrganizationToFree = mutation({
  args: {
    orgId: v.id("organizations"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.orgId);
    if (!row) {
      throw new Error("Organization not found");
    }
    if (row.plan === "free") {
      return null;
    }
    const previousPlan = row.plan;
    await ctx.db.patch(args.orgId, {
      plan: "free",
      subscriptionExpiresAt: undefined,
      billingProvider: undefined,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "org.downgradeToFree",
      targetTable: "organizations",
      targetId: args.orgId,
      payload: {
        previousPlan,
        note: args.note,
      },
    });
    return null;
  },
});

export const patchOrganizationBilling = mutation({
  args: {
    orgId: v.id("organizations"),
    plan: v.optional(planValidator),
    subscriptionExpiresAt: v.optional(v.union(v.number(), v.null())),
    billingProvider: v.optional(v.union(billingValidator, v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.orgId);
    if (!row) {
      throw new Error("Organization not found");
    }
    await ctx.db.patch(args.orgId, {
      ...(args.plan !== undefined ? { plan: args.plan } : {}),
      ...(args.subscriptionExpiresAt !== undefined ?
        args.subscriptionExpiresAt === null ?
          { subscriptionExpiresAt: undefined }
        : { subscriptionExpiresAt: args.subscriptionExpiresAt }
      : {}),
      ...(args.billingProvider !== undefined ?
        { billingProvider: args.billingProvider ?? undefined }
      : {}),
    });
    const auditPayload = {
      plan: args.plan,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
      billingProvider: args.billingProvider,
    };
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "org.patchBilling",
      targetTable: "organizations",
      targetId: args.orgId,
      payload: auditPayload,
    });
    return null;
  },
});

export const hideJobFromPublicBoard = mutation({
  args: {
    jobPostingId: v.id("jobPostings"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const job = await ctx.db.get(args.jobPostingId);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(args.jobPostingId, {
      platformHiddenAt: Date.now(),
      platformHiddenReason: args.reason,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "job.hideFromBoard",
      targetTable: "jobPostings",
      targetId: args.jobPostingId,
      payload: { reason: args.reason },
    });
    return null;
  },
});

export const showJobOnPublicBoard = mutation({
  args: {
    jobPostingId: v.id("jobPostings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const job = await ctx.db.get(args.jobPostingId);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(args.jobPostingId, {
      platformHiddenAt: undefined,
      platformHiddenReason: undefined,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "job.showOnBoard",
      targetTable: "jobPostings",
      targetId: args.jobPostingId,
    });
    return null;
  },
});

export const setJobFeatured = mutation({
  args: {
    jobPostingId: v.id("jobPostings"),
    featured: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const job = await ctx.db.get(args.jobPostingId);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(args.jobPostingId, { featured: args.featured });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "job.setFeatured",
      targetTable: "jobPostings",
      targetId: args.jobPostingId,
      payload: { featured: args.featured },
    });
    return null;
  },
});

export const suspendJobSeeker = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const u = await ctx.db.get(args.userId);
    if (!u) throw new Error("User not found");
    await ctx.db.patch(args.userId, {
      platformSuspendedAt: Date.now(),
      platformSuspendedReason: args.reason,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "user.suspend",
      targetTable: "users",
      targetId: args.userId,
      payload: { reason: args.reason },
    });
    return null;
  },
});

export const unsuspendJobSeeker = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const u = await ctx.db.get(args.userId);
    if (!u) throw new Error("User not found");
    await ctx.db.patch(args.userId, {
      platformSuspendedAt: undefined,
      platformSuspendedReason: undefined,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "user.unsuspend",
      targetTable: "users",
      targetId: args.userId,
    });
    return null;
  },
});

export const addPlatformAdminMember = mutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, clerkUserId: actorClerkUserId } =
      await requirePlatformAdmin(ctx);
    const cid = args.clerkUserId.trim();
    if (!cid) throw new Error("Invalid clerkUserId");

    const existing = await ctx.db
      .query("platformAdmins")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", cid))
      .unique();
    if (existing) return null;

    await ctx.db.insert("platformAdmins", {
      clerkUserId: cid,
      addedAt: Date.now(),
      addedByClerkUserId: actorClerkUserId,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "platformAdmin.add",
      targetTable: "platformAdmins",
      targetId: cid,
    });
    return null;
  },
});

export const removePlatformAdminMember = mutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const cid = args.clerkUserId.trim();

    const fromEnv = bootstrapPlatformAdminClerkIds();
    if (fromEnv.has(cid)) {
      throw new Error("Cannot remove env-bootstrapped platform admin.");
    }

    const row = await ctx.db
      .query("platformAdmins")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", cid))
      .unique();
    if (!row) return null;

    const allPersisted = await ctx.db.query("platformAdmins").take(512);
    if (allPersisted.length <= 1) {
      throw new Error("Refusing to remove the last stored platform admin.");
    }

    await ctx.db.delete(row._id);
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "platformAdmin.remove",
      targetTable: "platformAdmins",
      targetId: cid,
    });
    return null;
  },
});
