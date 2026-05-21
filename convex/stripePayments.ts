import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  listingCreditsForProduct,
  usdMinorUnitsForListingProduct,
  type ListingProductSlug,
} from "../lib/billingCatalog";
import { isEmployerBillingEnabled } from "./lib/employerBillingMode";

const listingProductValidator = v.union(
  v.literal("listing_single"),
  v.literal("listing_pack_5")
);

export const createCheckoutRecord = mutation({
  args: {
    clerkOrgId: v.string(),
    product: listingProductValidator,
  },
  returns: v.id("stripePayments"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    if (!(await isEmployerBillingEnabled(ctx))) {
      throw new Error("Employer billing is not enabled yet.");
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!org) throw new Error("Organization not found");

    const product = args.product as ListingProductSlug;
    const credits = listingCreditsForProduct(product);
    const amountUsdCents = usdMinorUnitsForListingProduct(product);

    return await ctx.db.insert("stripePayments", {
      issuerTokenIdentifier: identity.tokenIdentifier,
      clerkOrgId: args.clerkOrgId,
      product: args.product,
      credits,
      amountUsdCents,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const attachStripeSession = mutation({
  args: {
    paymentId: v.id("stripePayments"),
    stripeSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const record = await ctx.db.get(args.paymentId);
    if (!record || record.issuerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Payment not found");
    }

    if (record.status !== "pending") {
      throw new Error("This payment is no longer pending");
    }

    const existing = await ctx.db
      .query("stripePayments")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId)
      )
      .unique();

    if (existing && existing._id !== record._id) {
      throw new Error("Stripe session already linked to another payment");
    }

    await ctx.db.patch(args.paymentId, {
      stripeSessionId: args.stripeSessionId,
    });

    return null;
  },
});

export const fulfillFromStripeWebhook = mutation({
  args: {
    fulfillSecret: v.string(),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    clerkOrgId: v.string(),
    product: listingProductValidator,
    convexPaymentId: v.optional(v.id("stripePayments")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const configured =
      process.env.STRIPE_FULFILL_SECRET ??
      process.env.STRIPE_WEBHOOK_SECRET;
    if (!configured || args.fulfillSecret !== configured) {
      throw new Error("Unauthorized");
    }

    let record =
      args.convexPaymentId !== undefined
        ? await ctx.db.get(args.convexPaymentId)
        : null;

    if (!record) {
      record = await ctx.db
        .query("stripePayments")
        .withIndex("by_stripeSessionId", (q) =>
          q.eq("stripeSessionId", args.stripeSessionId)
        )
        .unique();
    }

    if (!record) {
      console.error(
        "stripe fulfill: no row for session —",
        args.stripeSessionId.slice(0, 48)
      );
      return null;
    }

    if (record.clerkOrgId !== args.clerkOrgId || record.product !== args.product) {
      console.error("stripe fulfill: metadata mismatch for session", args.stripeSessionId);
      return null;
    }

    if (record.status === "success") {
      return null;
    }

    await ctx.db.patch(record._id, {
      status: "success",
      stripeSessionId: args.stripeSessionId,
      ...(args.stripePaymentIntentId !== undefined && {
        stripePaymentIntentId: args.stripePaymentIntentId,
      }),
    });

    await ctx.runMutation(internal.organizations.grantListingCredits, {
      clerkOrgId: record.clerkOrgId,
      credits: record.credits,
    });

    return null;
  },
});

const paymentReturnValidator = v.object({
  status: v.union(
    v.literal("pending"),
    v.literal("success"),
    v.literal("failed")
  ),
  clerkOrgId: v.string(),
  product: listingProductValidator,
  credits: v.number(),
  amountUsdCents: v.number(),
  stripeSessionId: v.optional(v.string()),
  stripePaymentIntentId: v.optional(v.string()),
});

export const getMyStripePaymentBySessionId = query({
  args: { stripeSessionId: v.string() },
  returns: v.union(paymentReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const record = await ctx.db
      .query("stripePayments")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId)
      )
      .unique();

    if (!record || record.issuerTokenIdentifier !== identity.tokenIdentifier) {
      return null;
    }

    return {
      status: record.status,
      clerkOrgId: record.clerkOrgId,
      product: record.product,
      credits: record.credits,
      amountUsdCents: record.amountUsdCents,
      stripeSessionId: record.stripeSessionId,
      stripePaymentIntentId: record.stripePaymentIntentId,
    };
  },
});
