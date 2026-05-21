import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
      });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        clerkUserId: identity.subject,
        name: identity.name ?? "",
        email: identity.email ?? "",
      });
    }

    return null;
  },
});

export const upsertFromWebhook = internalMutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tokenIdentifier = `https://clerk.com|${args.clerkUserId}`;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
      });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier,
        clerkUserId: args.clerkUserId,
        name: args.name,
        email: args.email,
      });
    }

    return null;
  },
});
