import { auth } from "@clerk/nextjs/server";

/** Bootstrap admins from env (matches convex/lib/platformAdmin.ts). */
export async function isBootstrapPlatformAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const raw = process.env.PLATFORM_ADMIN_CLERK_USER_IDS ?? "";
  const ids = new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return ids.has(userId);
}

export function resolvePortalHomeHref(
  orgId: string | null | undefined,
  isPlatformAdmin: boolean
): string {
  if (isPlatformAdmin) return "/admin";
  if (orgId) return "/dashboard";
  return "/onboarding/company";
}

export function portalHomeLabel(
  orgId: string | null | undefined,
  isPlatformAdmin: boolean
): string {
  if (isPlatformAdmin) return "Go to Admin →";
  if (orgId) return "Go to Dashboard →";
  return "Set Up Your Company →";
}
