import type { MutationCtx, QueryCtx } from "../_generated/server";

export type PlatformAdminContext =
  | QueryCtx
  | MutationCtx;

export function bootstrapPlatformAdminClerkIds(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_CLERK_USER_IDS ?? "";
  return new Set(raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean));
}

export async function requirePlatformAdmin(ctx: PlatformAdminContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  const clerkUserId = identity.subject;

  const boot = bootstrapPlatformAdminClerkIds();
  if (boot.has(clerkUserId)) {
    return { identity, clerkUserId };
  }

  const row = await ctx.db
    .query("platformAdmins")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
  if (!row) {
    throw new Error("Unauthorized");
  }
  return { identity, clerkUserId };
}
