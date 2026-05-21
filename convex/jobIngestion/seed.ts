import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  AGGREGATOR_CLERK_ORG_ID,
  AGGREGATOR_ORG_NAME,
  AGGREGATOR_ORG_SLUG,
} from "./constants";

export const syncAggregatorOrgBranding = internalMutation({
  args: {},
  returns: v.object({
    updated: v.boolean(),
    orgId: v.optional(v.id("organizations")),
  }),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", AGGREGATOR_CLERK_ORG_ID)
      )
      .unique();

    if (!existing) {
      return { updated: false };
    }

    if (
      existing.name === AGGREGATOR_ORG_NAME &&
      existing.slug === AGGREGATOR_ORG_SLUG
    ) {
      return { updated: false, orgId: existing._id };
    }

    await ctx.db.patch(existing._id, {
      name: AGGREGATOR_ORG_NAME,
      slug: AGGREGATOR_ORG_SLUG,
    });

    return { updated: true, orgId: existing._id };
  },
});

export const ensureAggregatorOrg = internalMutation({
  args: {},
  returns: v.object({
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
  }),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", AGGREGATOR_CLERK_ORG_ID)
      )
      .unique();

    if (existing) {
      if (
        existing.name !== AGGREGATOR_ORG_NAME ||
        existing.slug !== AGGREGATOR_ORG_SLUG
      ) {
        await ctx.db.patch(existing._id, {
          name: AGGREGATOR_ORG_NAME,
          slug: AGGREGATOR_ORG_SLUG,
        });
      }
      return { orgId: existing._id, clerkOrgId: existing.clerkOrgId };
    }

    const orgId = await ctx.db.insert("organizations", {
      clerkOrgId: AGGREGATOR_CLERK_ORG_ID,
      name: AGGREGATOR_ORG_NAME,
      slug: AGGREGATOR_ORG_SLUG,
      plan: "pro",
      memberCount: 0,
      createdAt: Date.now(),
      description:
        "Platform-owned organization for externally aggregated job listings.",
      legacyUnlimitedListings: true,
    });

    return { orgId, clerkOrgId: AGGREGATOR_CLERK_ORG_ID };
  },
});
