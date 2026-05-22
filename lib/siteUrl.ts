/** Canonical production origin for metadata, sitemap, emails, and redirects. */
export const DEFAULT_SITE_ORIGIN = "https://www.waks.co.ke";

export const SUPPORT_EMAIL = "support@waks.co.ke";

export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    process.env.SITE_URL?.trim() ??
    DEFAULT_SITE_ORIGIN;
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteOrigin()}${normalized}`;
}
