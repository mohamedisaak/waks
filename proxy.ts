import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isMpesaSafaricomCallback = createRouteMatcher(["/api/mpesa/callback"]);
const isProtected = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isMpesaSafaricomCallback(req)) return;

  if (isProtected(req)) await auth.protect();
});

/** Next.js 16 `proxy.ts` convention: named `proxy` (default still supported). */
export const proxy = clerkProxy;
export default clerkProxy;

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
