export type OrgPlanSlug = "free" | "starter" | "pro";

export type BillingProvider = "clerk_stripe" | "mpesa";

/**
 * Paid access follows Convex `plan` plus optional `subscriptionExpiresAt`.
 * Missing expiry preserves legacy behaviour (paid until Clerk/subscription says otherwise).
 */
export function effectiveOrgTier(
  plan: OrgPlanSlug,
  subscriptionExpiresAt: number | undefined,
  nowMs: number
): OrgPlanSlug {
  if (plan === "free") return "free";
  if (subscriptionExpiresAt === undefined) return plan;
  if (nowMs > subscriptionExpiresAt) return "free";
  return plan;
}

/**
 * Tier used for feature access and paywalls. When billing is disabled (launch mode),
 * all orgs receive Pro access regardless of stored plan.
 */
export function resolveAccessTier(
  plan: OrgPlanSlug,
  subscriptionExpiresAt: number | undefined,
  nowMs: number,
  billingEnabled: boolean
): OrgPlanSlug {
  if (!billingEnabled) return "pro";
  return effectiveOrgTier(plan, subscriptionExpiresAt, nowMs);
}

/** All orgs can create and manage job postings subject to active slot limits. */
export function canManageJobPostings(_tier: OrgPlanSlug): boolean {
  return true;
}

/** @deprecated Use canManageJobPostings — posting is limited by listing slots, not tier. */
export function canPostJobs(tier: OrgPlanSlug): boolean {
  return canManageJobPostings(tier);
}

/** Legacy Starter monthly or Hiring Pro. */
function hasPaidListingPerks(tier: OrgPlanSlug): boolean {
  return tier === "starter" || tier === "pro";
}

/** Hiring Pro subscription (ATS + advanced workflow). */
export function hasHiringProSubscription(tier: OrgPlanSlug): boolean {
  return tier === "pro";
}

/** Grandfathered Starter plan features. */
export function hasLegacyStarterPlan(tier: OrgPlanSlug): boolean {
  return tier === "starter";
}

export function canUseFeaturedListings(tier: OrgPlanSlug): boolean {
  return hasPaidListingPerks(tier);
}

export function canUseApplicantTrackingPipeline(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canAdvanceToPremiumPipelineStages(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canUseRecruitingProductivityPack(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier) || hasLegacyStarterPlan(tier);
}

export function canUseScreeningQuestions(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier) || hasLegacyStarterPlan(tier);
}

export function canUseHiringAnalytics(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier) || hasLegacyStarterPlan(tier);
}

export function canUseAdvancedHiringInsights(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canTrackEmployerApplicationViews(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier) || hasLegacyStarterPlan(tier);
}

export function canUseEmployerNotes(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canCustomizeHiringPipeline(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canUseTalentPool(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canUseOutboundWebhooks(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier);
}

export function canUseInterviewScheduling(tier: OrgPlanSlug): boolean {
  return hasHiringProSubscription(tier) || hasLegacyStarterPlan(tier);
}
