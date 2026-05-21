import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const getMyPreferences = query({
  args: {},
  returns: v.object({
    emailEnabled: v.boolean(),
    whatsappOptIn: v.boolean(),
    whatsappPhone: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { emailEnabled: true, whatsappOptIn: false };
    }

    const row = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!row) {
      return { emailEnabled: true, whatsappOptIn: false };
    }

    return {
      emailEnabled: row.emailEnabled && row.emailUnsubscribedAt === undefined,
      whatsappOptIn: row.whatsappOptIn,
      whatsappPhone: row.whatsappPhone,
    };
  },
});

export const updateMyPreferences = mutation({
  args: {
    emailEnabled: v.optional(v.boolean()),
    whatsappOptIn: v.optional(v.boolean()),
    whatsappPhone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const emailEnabled =
      args.emailEnabled !== undefined
        ? args.emailEnabled
        : (existing?.emailEnabled ?? true);

    const whatsappOptIn =
      args.whatsappOptIn !== undefined
        ? args.whatsappOptIn
        : (existing?.whatsappOptIn ?? false);

    const whatsappPhone =
      args.whatsappPhone !== undefined
        ? args.whatsappPhone.trim() || undefined
        : existing?.whatsappPhone;

    if (whatsappOptIn && !whatsappPhone) {
      throw new Error("Phone number is required for WhatsApp notifications");
    }

    const patch = {
      emailEnabled,
      emailUnsubscribedAt:
        emailEnabled === false ? Date.now() : undefined,
      whatsappOptIn,
      whatsappPhone: whatsappOptIn ? whatsappPhone : undefined,
      whatsappOptInAt:
        whatsappOptIn && !existing?.whatsappOptIn
          ? Date.now()
          : existing?.whatsappOptInAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("notificationPreferences", {
        tokenIdentifier: identity.tokenIdentifier,
        ...patch,
      });
    }

    return null;
  },
});
