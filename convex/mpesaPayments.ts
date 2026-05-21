import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  listingCreditsForProduct,
  mpesaProductAmountKes,
  type MpesaProductSlug,
} from "../lib/billingCatalog";
import { isEmployerBillingEnabled } from "./lib/employerBillingMode";

const mpesaProductValidator = v.union(
  v.literal("pro_monthly"),
  v.literal("listing_single"),
  v.literal("listing_pack_5"),
  v.literal("starter"),
  v.literal("pro")
);

function isSubscriptionProduct(product: MpesaProductSlug): boolean {
  return (
    product === "pro_monthly" ||
    product === "pro" ||
    product === "starter"
  );
}

export const createPaymentIntent = mutation({
  args: {
    clerkOrgId: v.string(),
    plan: mpesaProductValidator,
    phoneNumber: v.string(),
  },
  returns: v.id("mpesaPayments"),
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

    const normalizedPhone = args.phoneNumber.replace(/\s+/g, "").trim();
    if (!/^254\d{9}$/.test(normalizedPhone)) {
      throw new Error("Phone must be in format 2547XXXXXXXX");
    }

    const product = args.plan as MpesaProductSlug;
    const amountKes = mpesaProductAmountKes(product);

    return await ctx.db.insert("mpesaPayments", {
      issuerTokenIdentifier: identity.tokenIdentifier,
      clerkOrgId: args.clerkOrgId,
      plan: args.plan,
      amountKes,
      phoneNumber: normalizedPhone,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updatePaymentWithCheckoutId = mutation({
  args: {
    paymentId: v.id("mpesaPayments"),
    checkoutRequestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const record = await ctx.db.get(args.paymentId);
    if (!record || record.issuerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(args.paymentId, {
      checkoutRequestId: args.checkoutRequestId,
      stkPromptSentAt: Date.now(),
    });

    return null;
  },
});

export const fulfillStkPaymentFromDarajaCallback = mutation({
  args: {
    fulfillSecret: v.string(),
    checkoutRequestId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    mpesaReceiptNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const configured =
      process.env.CONVEX_MPESA_STK_FULFILL_SECRET ??
      process.env.MPESA_STK_CALLBACK_SECRET;
    if (!configured || args.fulfillSecret !== configured) {
      throw new Error("Unauthorized");
    }

    const record = await ctx.db
      .query("mpesaPayments")
      .withIndex("by_checkoutRequestId", (q) =>
        q.eq("checkoutRequestId", args.checkoutRequestId)
      )
      .unique();

    if (!record) {
      console.error(
        "mpesa STK fulfill: no row for CheckoutRequestID —",
        args.checkoutRequestId.slice(0, 48)
      );
      return null;
    }

    if (args.status === "success") {
      if (record.status === "success") {
        return null;
      }

      await ctx.db.patch(record._id, {
        status: "success",
        mpesaReceiptNumber: args.mpesaReceiptNumber,
      });

      const product = record.plan as MpesaProductSlug;

      if (isSubscriptionProduct(product)) {
        const convexPlan =
          product === "starter" ? ("starter" as const) : ("pro" as const);
        await ctx.runMutation(
          internal.organizations.applyMpesaSubscriptionFromWebhook,
          {
            clerkOrgId: record.clerkOrgId,
            plan: convexPlan,
            monthsPaid: 1,
            legacyUnlimitedListings: product === "starter",
          }
        );
      } else {
        const credits = listingCreditsForProduct(product);
        await ctx.runMutation(internal.organizations.grantListingCredits, {
          clerkOrgId: record.clerkOrgId,
          credits,
        });
      }

      return null;
    }

    if (record.status === "pending") {
      await ctx.db.patch(record._id, { status: "failed" });
    }

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
  plan: mpesaProductValidator,
  amountKes: v.number(),
  phoneNumber: v.string(),
  checkoutRequestId: v.optional(v.string()),
  stkPromptSentAt: v.optional(v.number()),
  mpesaReceiptNumber: v.optional(v.string()),
});

export const getMyMpesaPaymentById = query({
  args: { paymentId: v.id("mpesaPayments") },
  returns: v.union(paymentReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const record = await ctx.db.get(args.paymentId);
    if (!record || record.issuerTokenIdentifier !== identity.tokenIdentifier) {
      return null;
    }

    return {
      status: record.status,
      clerkOrgId: record.clerkOrgId,
      plan: record.plan,
      amountKes: record.amountKes,
      phoneNumber: record.phoneNumber,
      checkoutRequestId: record.checkoutRequestId,
      stkPromptSentAt: record.stkPromptSentAt,
      mpesaReceiptNumber: record.mpesaReceiptNumber,
    };
  },
});

export const getMyPaymentByCheckoutRequestId = query({
  args: { checkoutRequestId: v.string() },
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("pending"),
        v.literal("success"),
        v.literal("failed")
      ),
      clerkOrgId: v.string(),
      plan: mpesaProductValidator,
      amountKes: v.number(),
      mpesaReceiptNumber: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const record = await ctx.db
      .query("mpesaPayments")
      .withIndex("by_checkoutRequestId", (q) =>
        q.eq("checkoutRequestId", args.checkoutRequestId)
      )
      .unique();

    if (!record || record.issuerTokenIdentifier !== identity.tokenIdentifier) {
      return null;
    }

    return {
      status: record.status,
      clerkOrgId: record.clerkOrgId,
      plan: record.plan,
      amountKes: record.amountKes,
      mpesaReceiptNumber: record.mpesaReceiptNumber,
    };
  },
});
