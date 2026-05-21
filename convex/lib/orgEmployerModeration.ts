import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function assertOrganizationNotSuspended(
  org: Doc<"organizations"> | null,
  msg = "Your organization access is temporarily paused. Contact support for details."
): asserts org is Doc<"organizations"> {
  if (!org || org.platformSuspendedAt !== undefined) {
    throw new Error(msg);
  }
}

export async function assertOrgByIdAllowedToPublishJobs(
  ctx: MutationCtx,
  orgId: Id<"organizations">
) {
  const org = await ctx.db.get(orgId);
  assertOrganizationNotSuspended(org);
}
