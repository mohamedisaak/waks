import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canUseOutboundWebhooks } from "../lib/orgPlan";
import { resolveOrgAccessTier } from "./lib/employerBillingMode";

const webhookEventValidator = v.literal("application.created");

export const listForOrg = query({
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

    if (!canUseOutboundWebhooks(tier)) {
      throw new Error("Pro plan required for outbound webhooks");
    }

    return await ctx.db
      .query("organizationWebhooks")
      .withIndex("by_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .collect();
  },
});

export const createWebhook = mutation({
  args: {
    clerkOrgId: v.string(),
    url: v.string(),
    signingSecret: v.optional(v.string()),
    enabled: v.boolean(),
    eventTypes: v.array(webhookEventValidator),
  },
  returns: v.id("organizationWebhooks"),
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

    if (!canUseOutboundWebhooks(tier)) {
      throw new Error("Pro plan required for outbound webhooks");
    }

    const trimmedUrl = args.url.trim();
    if (!trimmedUrl.startsWith("https://")) {
      throw new Error("Webhook URL must start with https://");
    }

    if (args.eventTypes.length === 0) {
      throw new Error("Select at least one event");
    }

    return await ctx.db.insert("organizationWebhooks", {
      clerkOrgId: args.clerkOrgId,
      url: trimmedUrl,
      signingSecret: args.signingSecret?.trim() || undefined,
      enabled: args.enabled,
      eventTypes: args.eventTypes,
    });
  },
});

export const updateWebhook = mutation({
  args: {
    id: v.id("organizationWebhooks"),
    clerkOrgId: v.string(),
    url: v.optional(v.string()),
    signingSecret: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    eventTypes: v.optional(v.array(webhookEventValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const webhook = await ctx.db.get(args.id);
    if (!webhook || webhook.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Webhook not found");
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseOutboundWebhooks(tier)) {
      throw new Error("Pro plan required for outbound webhooks");
    }

    const trimmedUrl =
      args.url !== undefined ? args.url.trim() : webhook.url;

    if (!trimmedUrl.startsWith("https://")) {
      throw new Error("Webhook URL must start with https://");
    }

    const nextEvents = args.eventTypes ?? webhook.eventTypes;
    if (nextEvents.length === 0) {
      throw new Error("Select at least one event");
    }

    await ctx.db.patch(args.id, {
      url: trimmedUrl,
      ...(args.signingSecret !== undefined && {
        signingSecret:
          args.signingSecret.trim().length > 0
            ? args.signingSecret.trim()
            : undefined,
      }),
      ...(args.enabled !== undefined && { enabled: args.enabled }),
      ...(args.eventTypes !== undefined && {
        eventTypes: args.eventTypes,
      }),
    });

    return null;
  },
});

export const deleteWebhook = mutation({
  args: {
    id: v.id("organizationWebhooks"),
    clerkOrgId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const webhook = await ctx.db.get(args.id);
    if (!webhook || webhook.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Webhook not found");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
