import type { CheerioAPI } from "cheerio";
import type { JobSourceSite } from "./constants";
import { absoluteUrl } from "./heuristics";
import { resolveRedirectUrl } from "./fetchHtml";

export type ApplicationExtraction = {
  applyUrl: string;
  applyViaSource: boolean;
  sourceListingUrl: string;
};

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const SOCIAL_HOST_RE =
  /(?:facebook|twitter|linkedin|instagram|youtube|whatsapp|google|yahoo|bit\.ly)/i;

function isAggregatorHost(host: string, source: JobSourceSite): boolean {
  const h = host.toLowerCase();
  if (source === "brightermonday") {
    return h.includes("brightermonday");
  }
  if (source === "myjobmag") {
    return h.includes("myjobmag");
  }
  if (source === "fuzu") {
    return h.includes("fuzu");
  }
  return false;
}

function isExcludedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (SOCIAL_HOST_RE.test(h)) return true;
    if (/^wa\.me$|whatsapp\.com/.test(h)) return true;
    if (/play\.google\.com|apps\.apple\.com/.test(h)) return true;
    if (/cookie|googletagmanager|webvitalize|roamcdn|hexagon\.build/.test(h)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function extractEmail(text: string): string | null {
  const matches = text.match(EMAIL_RE);
  if (!matches) return null;
  for (const raw of matches) {
    const email = raw.toLowerCase();
    if (
      email.includes("brightermonday") ||
      email.includes("myjobmag") ||
      email.includes("anonymous@") ||
      email.includes("noreply")
    ) {
      continue;
    }
    return raw;
  }
  return null;
}

function findExternalLinkInHtml(
  html: string,
  base: string,
  source: JobSourceSite
): string | null {
  const hrefRe = /href=["']([^"']+)["']/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1]!;
    if (href.startsWith("mailto:")) {
      candidates.push(href);
      continue;
    }
    if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) continue;
    const full = absoluteUrl(base, href);
    try {
      const u = new URL(full);
      if (isAggregatorHost(u.hostname, source)) continue;
      if (isExcludedExternalUrl(full)) continue;
      candidates.push(full);
    } catch {
      continue;
    }
  }
  return candidates.length > 0 ? candidates[candidates.length - 1]! : null;
}

async function extractMyJobMag(
  $: CheerioAPI,
  listingUrl: string
): Promise<ApplicationExtraction> {
  const base = "https://www.myjobmag.co.ke";
  const methodBlock =
    $("#application-method").parent().html() ??
    $("#application-method").nextAll().slice(0, 3).html() ??
    "";
  const applySec = $("#apply-sec").html() ?? "";
  const combined = `${methodBlock} ${applySec}`;

  const applyNowHref = $('a[href*="/apply-now/"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .find(Boolean);
  if (applyNowHref) {
    const absolute = absoluteUrl(base, applyNowHref);
    try {
      const resolved = await resolveRedirectUrl(absolute, {
        skipRobotsCheck: true,
      });
      if (!isAggregatorHost(new URL(resolved).hostname, "myjobmag")) {
        return {
          applyUrl: resolved,
          applyViaSource: false,
          sourceListingUrl: listingUrl,
        };
      }
    } catch {
      // fall through
    }
  }

  const mailtoLink = $('a[href^="mailto:"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .find((h) => h && !h.includes("myjobmag"));
  if (mailtoLink) {
    return {
      applyUrl: mailtoLink,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  const email = extractEmail(combined);
  if (email) {
    return {
      applyUrl: `mailto:${email}`,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  const jobAppHref = $('a[href*="/job-application/"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .find(Boolean);
  if (jobAppHref || /apply now button/i.test(combined)) {
    return {
      applyUrl: jobAppHref ? absoluteUrl(base, jobAppHref) : listingUrl,
      applyViaSource: true,
      sourceListingUrl: listingUrl,
    };
  }

  const descHtml =
    $("#job-details, .job-details, .job-description, article, .content")
      .last()
      .html() ?? "";
  const fallbackLink = findExternalLinkInHtml(descHtml, base, "myjobmag");
  if (fallbackLink) {
    return {
      applyUrl: fallbackLink.startsWith("mailto:")
        ? fallbackLink
        : fallbackLink,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  const fallbackEmail = extractEmail(descHtml.replace(/<[^>]+>/g, " "));
  if (fallbackEmail) {
    return {
      applyUrl: `mailto:${fallbackEmail}`,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  const applyMethodText = $("#application-method")
    .parent()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (applyMethodText.length > 40) {
    return {
      applyUrl: listingUrl,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  return {
    applyUrl: listingUrl,
    applyViaSource: true,
    sourceListingUrl: listingUrl,
  };
}

function extractBrighterMonday(
  $: CheerioAPI,
  listingUrl: string
): ApplicationExtraction {
  const base = "https://www.brightermonday.co.ke";

  const platformOnly =
    $('a[href*="sign-up?apply="], a[href*="apply="][href*="account"]')
      .length > 0 ||
    /log in and apply|easy apply/i.test($.html() ?? "");

  if (platformOnly) {
    return {
      applyUrl: listingUrl,
      applyViaSource: true,
      sourceListingUrl: listingUrl,
    };
  }

  const descHtml =
    $("[class*='description'], article, main").first().html() ?? "";
  const externalLink = findExternalLinkInHtml(descHtml, base, "brightermonday");
  if (externalLink) {
    return {
      applyUrl: externalLink,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  const descText = $("[class*='description'], article, main").first().text();
  const email = extractEmail(descText);
  if (email) {
    return {
      applyUrl: `mailto:${email}`,
      applyViaSource: false,
      sourceListingUrl: listingUrl,
    };
  }

  return {
    applyUrl: listingUrl,
    applyViaSource: true,
    sourceListingUrl: listingUrl,
  };
}

export async function extractApplication(
  source: JobSourceSite,
  $: CheerioAPI,
  listingUrl: string
): Promise<ApplicationExtraction> {
  if (source === "myjobmag") {
    return extractMyJobMag($, listingUrl);
  }
  if (source === "brightermonday") {
    return extractBrighterMonday($, listingUrl);
  }
  return {
    applyUrl: listingUrl,
    applyViaSource: true,
    sourceListingUrl: listingUrl,
  };
}
