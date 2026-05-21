/**
 * Resolves Convex deployment HTTPS URL for the browser bundle and Route Handlers.
 *
 * Handles a common footgun: a shell/exported NEXT_PUBLIC_CONVEX_URL=… placeholder that
 * overrides .env.local. Falls back from NEXT_PUBLIC_CONVEX_SITE_URL (…convex.site → …cloud).
 */

function isGarbageUrl(raw: string | undefined): boolean {
  if (raw === undefined || raw === null) return true;
  const s = raw.trim();
  if (s === "" || s === "...") return true;
  if (!(s.startsWith("http://") || s.startsWith("https://"))) return true;
  return false;
}

function normalizeHttpUrlCandidate(raw: string): string | undefined {
  const s = raw.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.href.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function deriveDeploymentUrlFromConvexSite(siteRaw: string): string | undefined {
  try {
    const url = new URL(siteRaw.trim());
    if (!/\.convex\.site$/i.test(url.hostname)) {
      return undefined;
    }
    url.hostname = url.hostname.replace(/\.convex\.site$/i, ".convex.cloud");
    return normalizeHttpUrlCandidate(url.href);
  } catch {
    return undefined;
  }
}

/** Used by ConvexClientProvider, server routes, etc. */
export function getPublicConvexDeploymentUrl(): string {
  const cloudRaw = process.env.NEXT_PUBLIC_CONVEX_URL;
  const siteRaw = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

  if (!isGarbageUrl(cloudRaw)) {
    const n = normalizeHttpUrlCandidate(cloudRaw!);
    if (n !== undefined) return n;
  }

  if (siteRaw && !isGarbageUrl(siteRaw)) {
    const fromSite = deriveDeploymentUrlFromConvexSite(siteRaw);
    if (fromSite !== undefined) return fromSite;
  }

  const hint =
    !(isGarbageUrl(cloudRaw) && isGarbageUrl(siteRaw))
      ? `Unset any shell override (e.g. export NEXT_PUBLIC_CONVEX_URL='...'); keep one line in .env.local and restart Next. Received NEXT_PUBLIC_CONVEX_URL=${JSON.stringify(cloudRaw)} NEXT_PUBLIC_CONVEX_SITE_URL=${JSON.stringify(siteRaw)}`
      : "Add NEXT_PUBLIC_CONVEX_URL=https://YOUR_DEPLOYMENT.REGION.convex.cloud to .env.local (or NEXT_PUBLIC_CONVEX_SITE_URL with a .convex.site host).";

  throw new Error(`Could not resolve Convex deployment URL. ${hint}`);
}

/** next.config.ts: string or undefined — undefined means omit env forcing. */
export function tryGetPublicConvexDeploymentUrl(): string | undefined {
  try {
    return getPublicConvexDeploymentUrl();
  } catch {
    return undefined;
  }
}
