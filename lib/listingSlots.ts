import { FREE_ACTIVE_JOB_SLOTS } from "./billingCatalog";
import type { OrgPlanSlug } from "./orgPlan";

/** Org fields used to compute concurrent active job limits. */
export type OrgListingEntitlements = {
  plan: OrgPlanSlug;
  listingCredits?: number;
  legacyUnlimitedListings?: boolean;
};

const UNLIMITED_ACTIVE_JOBS = 9999;

/**
 * Grandfathered unlimited listings: explicit flag, or legacy Starter rows
 * created before per-job billing. Hiring Pro never included unlimited postings.
 */
export function hasLegacyUnlimitedListings(
  org: OrgListingEntitlements
): boolean {
  if (org.legacyUnlimitedListings === false) return false;
  if (org.plan === "pro") return false;
  if (org.legacyUnlimitedListings === true) return true;
  return org.plan === "starter";
}

export function maxActiveJobSlots(
  org: OrgListingEntitlements,
  billingEnabled = true
): number {
  if (!billingEnabled || hasLegacyUnlimitedListings(org)) return UNLIMITED_ACTIVE_JOBS;
  return FREE_ACTIVE_JOB_SLOTS + Math.max(0, org.listingCredits ?? 0);
}

export type ActivateSlotResult =
  | { ok: true; consumeCredit: boolean; assignSlotKind: "free" | "paid" }
  | { ok: false; code: "LISTING_CREDITS_REQUIRED"; message: string };

/**
 * Whether activating one more job is allowed and if a listing credit must be consumed.
 * `activeCount` = current active jobs excluding the job being activated (if re-activating).
 */
export function evaluateJobActivationSlot(
  org: OrgListingEntitlements,
  activeCount: number,
  billingEnabled = true
): ActivateSlotResult {
  if (!billingEnabled || hasLegacyUnlimitedListings(org)) {
    return { ok: true, consumeCredit: false, assignSlotKind: "free" };
  }

  const max = maxActiveJobSlots(org);
  if (activeCount >= max) {
    return {
      ok: false,
      code: "LISTING_CREDITS_REQUIRED",
      message:
        "You have reached your active job limit. Purchase a listing credit (KES 1,000) or close another posting.",
    };
  }

  if (activeCount < FREE_ACTIVE_JOB_SLOTS) {
    return { ok: true, consumeCredit: false, assignSlotKind: "free" };
  }

  const credits = org.listingCredits ?? 0;
  if (credits < 1) {
    return {
      ok: false,
      code: "LISTING_CREDITS_REQUIRED",
      message:
        "This job needs a listing credit (KES 1,000 per extra active posting). Purchase a credit to publish.",
    };
  }

  return { ok: true, consumeCredit: true, assignSlotKind: "paid" };
}
