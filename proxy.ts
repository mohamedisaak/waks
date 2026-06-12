import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { DEFAULT_SITE_ORIGIN } from "@/lib/siteUrl";

const isMpesaSafaricomCallback = createRouteMatcher(["/api/mpesa/callback"]);
const isProtected = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);

function clerkAuthorizedParties(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    process.env.SITE_URL?.trim() ??
    DEFAULT_SITE_ORIGIN;
  const origin = raw.replace(/\/$/, "");
  const parties = new Set<string>([origin, DEFAULT_SITE_ORIGIN]);
  if (origin.startsWith("https://www.")) {
    parties.add(origin.replace("https://www.", "https://"));
  }
  return [...parties];
}

const clerkProxy = clerkMiddleware(
  async (auth, req) => {
    if (isMpesaSafaricomCallback(req)) return;

    if (isProtected(req)) await auth.protect();
  },
  { authorizedParties: clerkAuthorizedParties() }
);

/** Next.js 16 `proxy.ts` convention: named `proxy` (default still supported). */
export const proxy = clerkProxy;
export default clerkProxy;

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
