import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const SITE_KEY = "global" as const;

export type GlobalSiteSettingsFields = Omit<
  Doc<"siteSettings">,
  "_id" | "_creationTime" | "employerBillingEnabled"
> & {
  employerBillingEnabled: boolean;
};

export const EMPTY_SITE_UPDATED_AT = 0;

export function defaultSiteSettingsFields(): Omit<
  GlobalSiteSettingsFields,
  "updatedAt"
> & { updatedAt: number } {
  return {
    key: SITE_KEY,
    adsenseEnabled: false,
    adsenseClientSlot: undefined,
    jobsRailAdsEnabled: false,
    homepageAdsEnabled: false,
    employerBillingEnabled: false,
    updatedAt: EMPTY_SITE_UPDATED_AT,
  };
}

export function normalizeSiteSettings(
  doc: Doc<"siteSettings"> | null
): GlobalSiteSettingsFields {
  if (!doc) {
    return defaultSiteSettingsFields();
  }
  return {
    key: doc.key,
    adsenseEnabled: doc.adsenseEnabled,
    adsenseClientSlot: doc.adsenseClientSlot,
    jobsRailAdsEnabled: doc.jobsRailAdsEnabled,
    homepageAdsEnabled: doc.homepageAdsEnabled,
    employerBillingEnabled: doc.employerBillingEnabled ?? false,
    updatedAt: doc.updatedAt,
  };
}

async function fetchGlobal(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q) => q.eq("key", SITE_KEY))
    .unique();
}

export async function getGlobalSiteSettings(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"siteSettings"> | null> {
  return await fetchGlobal(ctx);
}

export async function insertDefaultSiteSettingsIfMissing(
  ctx: MutationCtx
): Promise<Doc<"siteSettings">> {
  let row = await fetchGlobal(ctx);
  if (!row) {
    const id = await ctx.db.insert("siteSettings", {
      key: SITE_KEY,
      adsenseEnabled: false,
      jobsRailAdsEnabled: false,
      homepageAdsEnabled: false,
      employerBillingEnabled: false,
      updatedAt: Date.now(),
    });
    row = await ctx.db.get(id);
    if (!row) {
      throw new Error("Failed to create site settings");
    }
  }
  return row;
}
