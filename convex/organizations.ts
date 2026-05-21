import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import {
  hasLegacyUnlimitedListings,
  maxActiveJobSlots,
  orgListingEntitlements,
} from "./lib/listingSlots";
import { isEmployerBillingEnabled } from "./lib/employerBillingMode";

const planValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("pro")
);

const billingProviderValidator = v.union(
  v.literal("clerk_stripe"),
  v.literal("mpesa")
);

export const upsertOrg = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    plan: planValidator,
    createdAt: v.number(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (existing) {
      const profilePatch = {
        name: args.name,
        slug: args.slug,
        logoUrl: args.logoUrl,
        ...(args.website !== undefined && { website: args.website }),
        ...(args.industry !== undefined && { industry: args.industry }),
        ...(args.companySize !== undefined && { companySize: args.companySize }),
        ...(args.description !== undefined && { description: args.description }),
      };
      // M-Pesa (and Convex-first) billing: Clerk org metadata may still show Free;
      // never clobber Convex entitlements from the sidebar sync.
      if (existing.billingProvider === "mpesa") {
        await ctx.db.patch(existing._id, profilePatch);
      } else {
        await ctx.db.patch(existing._id, { ...profilePatch, plan: args.plan });
      }
      return existing._id;
    }

    return await ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      logoUrl: args.logoUrl,
      plan: args.plan,
      memberCount: 1,
      createdAt: args.createdAt,
      website: args.website,
      industry: args.industry,
      companySize: args.companySize,
      description: args.description,
    });
  },
});

export const getByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      clerkOrgId: v.string(),
      name: v.string(),
      slug: v.string(),
      logoUrl: v.optional(v.string()),
      plan: planValidator,
      memberCount: v.number(),
      createdAt: v.number(),
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      companySize: v.optional(v.string()),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      twitter: v.optional(v.string()),
      phone: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
      billingProvider: v.optional(billingProviderValidator),
      platformSuspendedAt: v.optional(v.number()),
      platformSuspendedReason: v.optional(v.string()),
      listingCredits: v.optional(v.number()),
      legacyUnlimitedListings: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<Doc<"organizations"> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();
  },
});

export const updateProfile = mutation({
  args: {
    clerkOrgId: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    twitter: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(org._id, {
      website: args.website,
      industry: args.industry,
      companySize: args.companySize,
      description: args.description,
      location: args.location,
      linkedin: args.linkedin,
      twitter: args.twitter,
      phone: args.phone,
    });

    return null;
  },
});

export const upsertFromWebhook = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        logoUrl: args.logoUrl,
      });
    } else {
      await ctx.db.insert("organizations", {
        clerkOrgId: args.clerkOrgId,
        name: args.name,
        slug: args.slug,
        logoUrl: args.logoUrl,
        plan: "free",
        memberCount: 1,
        createdAt: args.createdAt,
      });
    }

    return null;
  },
});

/**
 * Called from the client immediately when a Clerk checkout completes.
 * Keeps the Convex plan in sync even when Stripe schedules the change for a
 * future billing date (e.g. downgrade "upcoming" state), so the app reflects
 * the user's intent right away instead of waiting until the next billing cycle.
 */
export const updatePlanFromClient = mutation({
  args: {
    clerkOrgId: v.string(),
    plan: planValidator,
  },
  returns: v.null(),
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

    if (org.billingProvider === "mpesa") {
      throw new Error(
        "This organization is on M-Pesa billing. Renew with M-Pesa or contact support to switch payment methods."
      );
    }

    if (args.plan === "free") {
      const { subscriptionExpiresAt: _e, billingProvider: _b, ...rest } = org;
      await ctx.db.replace(org._id, { ...rest, plan: "free" });
      return null;
    }

    const legacyUnlimitedListings =
      args.plan === "pro"
        ? false
        : args.plan === "starter"
          ? (org.legacyUnlimitedListings ?? true)
          : org.legacyUnlimitedListings;

    await ctx.db.replace(org._id, {
      ...org,
      plan: args.plan,
      billingProvider: "clerk_stripe",
      ...(legacyUnlimitedListings !== undefined && {
        legacyUnlimitedListings,
      }),
    });
    return null;
  },
});

export const syncPlan = internalMutation({
  args: {
    clerkOrgId: v.string(),
    plan: planValidator,
    subscriptionExpiresAt: v.optional(v.union(v.number(), v.null())),
    billingProvider: v.optional(
      v.union(v.literal("clerk_stripe"), v.literal("mpesa"), v.null())
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) return null;

    if (org.billingProvider === "mpesa") {
      return null;
    }

    if (args.plan === "free") {
      const { subscriptionExpiresAt: _e, billingProvider: _b, ...rest } = org;
      await ctx.db.replace(org._id, { ...rest, plan: "free" });
      return null;
    }

    let subscriptionExpiresAt = org.subscriptionExpiresAt;
    if (args.subscriptionExpiresAt !== undefined) {
      subscriptionExpiresAt =
        args.subscriptionExpiresAt === null
          ? undefined
          : Math.max(
              args.subscriptionExpiresAt,
              org.subscriptionExpiresAt ?? 0
            );
    }

    let billingProvider: "clerk_stripe" | "mpesa" | undefined =
      org.billingProvider;
    if (args.billingProvider !== undefined) {
      billingProvider =
        args.billingProvider === null ? undefined : args.billingProvider;
    } else if (!billingProvider) {
      billingProvider = "clerk_stripe";
    }

    let legacyUnlimitedListings = org.legacyUnlimitedListings;
    if (args.plan === "pro") {
      legacyUnlimitedListings = false;
    } else if (args.plan === "starter" && legacyUnlimitedListings === undefined) {
      legacyUnlimitedListings = true;
    }

    await ctx.db.replace(org._id, {
      ...org,
      plan: args.plan,
      subscriptionExpiresAt,
      billingProvider,
      ...(legacyUnlimitedListings !== undefined && {
        legacyUnlimitedListings,
      }),
    });

    return null;
  },
});

export const grantListingCredits = internalMutation({
  args: {
    clerkOrgId: v.string(),
    credits: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org || args.credits < 1) return null;

    await ctx.db.patch(org._id, {
      listingCredits: (org.listingCredits ?? 0) + args.credits,
    });

    return null;
  },
});

export const applyMpesaSubscriptionFromWebhook = internalMutation({
  args: {
    clerkOrgId: v.string(),
    plan: v.union(v.literal("starter"), v.literal("pro")),
    monthsPaid: v.number(),
    subscriptionExpiresAt: v.optional(v.number()),
    legacyUnlimitedListings: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) return null;

    const now = Date.now();
    const periodMs = args.monthsPaid * 30 * 24 * 60 * 60 * 1000;
    const base =
      org.subscriptionExpiresAt !== undefined &&
      org.subscriptionExpiresAt > now
        ? org.subscriptionExpiresAt
        : now;
    const end =
      args.subscriptionExpiresAt !== undefined
        ? args.subscriptionExpiresAt
        : base + periodMs;

    const legacyUnlimitedListings =
      args.legacyUnlimitedListings ?? args.plan === "starter";

    await ctx.db.replace(org._id, {
      ...org,
      plan: args.plan,
      subscriptionExpiresAt: end,
      billingProvider: "mpesa",
      legacyUnlimitedListings,
    });

    return null;
  },
});

export const getListingEntitlements = query({
  args: { clerkOrgId: v.string() },
  returns: v.object({
    activeJobCount: v.number(),
    maxActiveJobSlots: v.number(),
    listingCredits: v.number(),
    legacyUnlimitedListings: v.boolean(),
    freeSlotsRemaining: v.number(),
    slotsRemaining: v.number(),
    canActivateMoreJobs: v.boolean(),
  }),
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

    const jobs = await ctx.db
      .query("jobPostings")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .collect();
    const activeJobCount = jobs.filter((j) => j.status === "active").length;

    const billingEnabled = await isEmployerBillingEnabled(ctx);
    const entitlements = orgListingEntitlements(org);
    const unlimited =
      !billingEnabled || hasLegacyUnlimitedListings(entitlements);
    const max = maxActiveJobSlots(entitlements, billingEnabled);
    const credits = org.listingCredits ?? 0;

    const slotsRemaining = unlimited
      ? max
      : Math.max(0, max - activeJobCount);
    const canActivateMoreJobs = unlimited || activeJobCount < max;

    return {
      activeJobCount,
      maxActiveJobSlots: max,
      listingCredits: credits,
      legacyUnlimitedListings: unlimited,
      freeSlotsRemaining: unlimited
        ? max
        : Math.max(0, 1 - activeJobCount),
      slotsRemaining,
      canActivateMoreJobs,
    };
  },
});

export const syncMemberCount = internalMutation({
  args: {
    clerkOrgId: v.string(),
    delta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (org) {
      await ctx.db.patch(org._id, {
        memberCount: Math.max(0, org.memberCount + args.delta),
      });
    }

    return null;
  },
});
