import {
  evaluateJobActivationSlot,
  hasLegacyUnlimitedListings,
  maxActiveJobSlots,
  type OrgListingEntitlements,
} from "../../lib/listingSlots";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isEmployerBillingEnabled } from "./employerBillingMode";

export {
  evaluateJobActivationSlot,
  hasLegacyUnlimitedListings,
  maxActiveJobSlots,
  type OrgListingEntitlements,
};

export function orgListingEntitlements(
  org: Doc<"organizations">
): OrgListingEntitlements {
  return {
    plan: org.plan,
    listingCredits: org.listingCredits,
    legacyUnlimitedListings: org.legacyUnlimitedListings,
  };
}

export async function countActiveJobsForOrg(
  ctx: MutationCtx,
  clerkOrgId: string,
  excludeJobId?: Doc<"jobPostings">["_id"]
): Promise<number> {
  const jobs = await ctx.db
    .query("jobPostings")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .collect();
  return jobs.filter(
    (j) => j.status === "active" && j._id !== excludeJobId
  ).length;
}

/**
 * Enforces slot limits when publishing. Consumes a listing credit when needed.
 */
export async function applyJobActivationSlot(
  ctx: MutationCtx,
  org: Doc<"organizations">,
  clerkOrgId: string,
  excludeJobId?: Doc<"jobPostings">["_id"]
): Promise<"free" | "paid"> {
  const billingEnabled = await isEmployerBillingEnabled(ctx);
  const entitlements = orgListingEntitlements(org);
  const activeCount = await countActiveJobsForOrg(
    ctx,
    clerkOrgId,
    excludeJobId
  );
  const decision = evaluateJobActivationSlot(
    entitlements,
    activeCount,
    billingEnabled
  );

  if (!decision.ok) {
    throw new Error(decision.message);
  }

  if (decision.consumeCredit) {
    const next = Math.max(0, (org.listingCredits ?? 0) - 1);
    await ctx.db.patch(org._id, { listingCredits: next });
  }

  return decision.assignSlotKind;
}
