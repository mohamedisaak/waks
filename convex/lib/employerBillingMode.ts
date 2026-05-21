import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { resolveAccessTier, type OrgPlanSlug } from "../../lib/orgPlan";
import {
  getGlobalSiteSettings,
  normalizeSiteSettings,
} from "./siteSettingsDoc";

export async function isEmployerBillingEnabled(
  ctx: QueryCtx | MutationCtx
): Promise<boolean> {
  const row = await getGlobalSiteSettings(ctx);
  const settings = normalizeSiteSettings(row);
  return settings.employerBillingEnabled;
}

export async function resolveOrgAccessTier(
  ctx: QueryCtx | MutationCtx,
  org: Pick<Doc<"organizations">, "plan" | "subscriptionExpiresAt">
): Promise<OrgPlanSlug> {
  const billingEnabled = await isEmployerBillingEnabled(ctx);
  return resolveAccessTier(
    org.plan,
    org.subscriptionExpiresAt,
    Date.now(),
    billingEnabled
  );
}
