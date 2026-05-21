import { mutation, query } from "../_generated/server";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import { appendAdminAudit } from "../lib/adminAudit";
import {
  getGlobalSiteSettings,
  insertDefaultSiteSettingsIfMissing,
  normalizeSiteSettings,
} from "../lib/siteSettingsDoc";

const slotKeyValidator = v.union(
  v.literal("home_hero"),
  v.literal("jobs_rail"),
  v.literal("jobs_inline")
);

const placementRowValidator = v.object({
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

const settingsOut = v.object({
  adsenseEnabled: v.boolean(),
  adsenseClientSlot: v.optional(v.string()),
  jobsRailAdsEnabled: v.boolean(),
  homepageAdsEnabled: v.boolean(),
  employerBillingEnabled: v.boolean(),
  updatedAt: v.number(),
});

export const thirdPartyMarketingSettingsAdmin = query({
  args: {},
  returns: settingsOut,
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);
    const row = await getGlobalSiteSettings(ctx);
    const s = normalizeSiteSettings(row);
    return {
      adsenseEnabled: s.adsenseEnabled,
      adsenseClientSlot: s.adsenseClientSlot,
      jobsRailAdsEnabled: s.jobsRailAdsEnabled,
      homepageAdsEnabled: s.homepageAdsEnabled,
      employerBillingEnabled: s.employerBillingEnabled,
      updatedAt: s.updatedAt,
    };
  },
});

export const patchThirdPartyMarketingSettings = mutation({
  args: {
    adsenseEnabled: v.optional(v.boolean()),
    adsenseClientSlot: v.optional(v.union(v.string(), v.null())),
    jobsRailAdsEnabled: v.optional(v.boolean()),
    homepageAdsEnabled: v.optional(v.boolean()),
    employerBillingEnabled: v.optional(v.boolean()),
  },
  returns: settingsOut,
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    let row = await insertDefaultSiteSettingsIfMissing(ctx);
    await ctx.db.patch(row._id, {
      ...(args.adsenseEnabled !== undefined ?
        { adsenseEnabled: args.adsenseEnabled }
      : {}),
      ...(args.adsenseClientSlot !== undefined ?
        { adsenseClientSlot: args.adsenseClientSlot ?? undefined }
      : {}),
      ...(args.jobsRailAdsEnabled !== undefined ?
        { jobsRailAdsEnabled: args.jobsRailAdsEnabled }
      : {}),
      ...(args.homepageAdsEnabled !== undefined ?
        { homepageAdsEnabled: args.homepageAdsEnabled }
      : {}),
      ...(args.employerBillingEnabled !== undefined ?
        { employerBillingEnabled: args.employerBillingEnabled }
      : {}),
      updatedAt: Date.now(),
    });
    row = (await ctx.db.get(row._id))!;
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action:
        args.employerBillingEnabled !== undefined
          ? "site.patchEmployerBilling"
          : "site.patchMarketingSettings",
      targetTable: "siteSettings",
      targetId: row._id,
      payload: args,
    });
    const s = normalizeSiteSettings(row);
    return {
      adsenseEnabled: s.adsenseEnabled,
      adsenseClientSlot: s.adsenseClientSlot,
      jobsRailAdsEnabled: s.jobsRailAdsEnabled,
      homepageAdsEnabled: s.homepageAdsEnabled,
      employerBillingEnabled: s.employerBillingEnabled,
      updatedAt: s.updatedAt,
    };
  },
});

export const placementsList = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(placementRowValidator),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    return await ctx.db
      .query("sponsoredPlacements")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const placementInsert = mutation({
  args: {
    slotKey: slotKeyValidator,
    title: v.string(),
    href: v.string(),
    sponsorLabel: v.optional(v.string()),
    priority: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    active: v.boolean(),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
  },
  returns: v.id("sponsoredPlacements"),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const id = await ctx.db.insert("sponsoredPlacements", {
      slotKey: args.slotKey,
      title: args.title,
      href: args.href,
      sponsorLabel: args.sponsorLabel,
      priority: args.priority,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      active: args.active,
      startAt: args.startAt,
      endAt: args.endAt,
      impressionCount: 0,
      clickCount: 0,
    });
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "sponsored.create",
      targetTable: "sponsoredPlacements",
      targetId: id,
    });
    return id;
  },
});

export const placementPatch = mutation({
  args: {
    id: v.id("sponsoredPlacements"),
    title: v.optional(v.string()),
    href: v.optional(v.string()),
    sponsorLabel: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    imageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    active: v.optional(v.boolean()),
    startAt: v.optional(v.union(v.number(), v.null())),
    endAt: v.optional(v.union(v.number(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Placement not found");

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.href !== undefined ? { href: args.href } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.active !== undefined ? { active: args.active } : {}),
      ...(args.sponsorLabel !== undefined ?
        { sponsorLabel: args.sponsorLabel ?? undefined }
      : {}),
      ...(args.imageUrl !== undefined ?
        { imageUrl: args.imageUrl ?? undefined }
      : {}),
      ...(args.imageStorageId !== undefined ?
        { imageStorageId: args.imageStorageId ?? undefined }
      : {}),
      ...(args.startAt !== undefined ?
        args.startAt === null ?
          { startAt: undefined }
        : { startAt: args.startAt }
      : {}),
      ...(args.endAt !== undefined ?
        args.endAt === null ?
          { endAt: undefined }
        : { endAt: args.endAt }
      : {}),
    });

    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "sponsored.patch",
      targetTable: "sponsoredPlacements",
      targetId: args.id,
      payload: args,
    });
    return null;
  },
});

export const placementRemove = mutation({
  args: { id: v.id("sponsoredPlacements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await ctx.db.delete(args.id);
    await appendAdminAudit(ctx, {
      actorTokenIdentifier: identity.tokenIdentifier,
      action: "sponsored.delete",
      targetTable: "sponsoredPlacements",
      targetId: args.id,
    });
    return null;
  },
});
