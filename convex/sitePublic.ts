import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  getGlobalSiteSettings,
  normalizeSiteSettings,
} from "./lib/siteSettingsDoc";

const slotKeyValidator = v.union(
  v.literal("home_hero"),
  v.literal("jobs_rail"),
  v.literal("jobs_inline")
);

const placementCardValidator = v.object({
  _id: v.id("sponsoredPlacements"),
  _creationTime: v.number(),
  slotKey: slotKeyValidator,
  title: v.string(),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  href: v.string(),
  sponsorLabel: v.optional(v.string()),
  priority: v.number(),
  active: v.boolean(),
  startAt: v.optional(v.number()),
  endAt: v.optional(v.number()),
  impressionCount: v.number(),
  clickCount: v.number(),
});

export const thirdPartyMarketingSettings = query({
  args: {},
  returns: v.object({
    adsenseEnabled: v.boolean(),
    adsenseClientSlot: v.optional(v.string()),
    jobsRailAdsEnabled: v.boolean(),
    homepageAdsEnabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const row = await getGlobalSiteSettings(ctx);
    const s = normalizeSiteSettings(row);
    return {
      adsenseEnabled: s.adsenseEnabled,
      adsenseClientSlot: s.adsenseClientSlot,
      jobsRailAdsEnabled: s.jobsRailAdsEnabled,
      homepageAdsEnabled: s.homepageAdsEnabled,
    };
  },
});

export const employerBillingSettings = query({
  args: {},
  returns: v.object({
    employerBillingEnabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const row = await getGlobalSiteSettings(ctx);
    const s = normalizeSiteSettings(row);
    return {
      employerBillingEnabled: s.employerBillingEnabled,
    };
  },
});

export const sponsoredForSlot = query({
  args: {
    slotKey: slotKeyValidator,
    viewerClockMs: v.number(),
  },
  returns: v.array(placementCardValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("sponsoredPlacements")
      .withIndex("by_active_slot", (q) =>
        q.eq("active", true).eq("slotKey", args.slotKey)
      )
      .order("desc")
      .take(24);

    const t = args.viewerClockMs;
    const candidates = rows.filter((r) => {
      if (!r.active) return false;
      if (r.startAt !== undefined && t < r.startAt) return false;
      if (r.endAt !== undefined && t > r.endAt) return false;
      return true;
    });

    return candidates.sort((a, b) => b.priority - a.priority);
  },
});

export const bumpPlacementImpression = mutation({
  args: { placementId: v.id("sponsoredPlacements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.placementId);
    if (!row?.active) return null;
    await ctx.db.patch(args.placementId, {
      impressionCount: row.impressionCount + 1,
    });
    return null;
  },
});

export const bumpPlacementClick = mutation({
  args: { placementId: v.id("sponsoredPlacements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.placementId);
    if (!row?.active) return null;
    await ctx.db.patch(args.placementId, {
      clickCount: row.clickCount + 1,
    });
    return null;
  },
});

export const sponsoredImageUrlForClient = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
