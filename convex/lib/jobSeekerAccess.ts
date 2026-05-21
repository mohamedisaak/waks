import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function jobSeekerAccountSuspendedReason(
  ctx: QueryCtx | MutationCtx,
  tokenIdentifier: string
): Promise<string | null> {
  const row = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  if (row?.platformSuspendedAt !== undefined) {
    return row.platformSuspendedReason ?? "Account suspended";
  }
  return null;
}

export async function throwIfJobSeekerSuspended(
  ctx: MutationCtx,
  tokenIdentifier: string
) {
  const reason = await jobSeekerAccountSuspendedReason(ctx, tokenIdentifier);
  if (reason) {
    throw new Error(reason);
  }
}
