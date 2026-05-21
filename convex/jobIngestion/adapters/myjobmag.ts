import * as cheerio from "cheerio";
import type { JobSourceSite } from "../constants";
import type { ScrapedJobDraft } from "../types";
import {
  absoluteUrl,
  externalIdFromUrl,
  inferEmploymentType,
  inferLocationType,
} from "../heuristics";
import { fetchHtmlPage } from "../fetchHtml";
import { extractApplication } from "../extractApplication";
import {
  buildStructuredJobFields,
  parseMyJobMagSections,
} from "../parseJobSections";

const BASE = "https://www.myjobmag.co.ke";
const SOURCE: JobSourceSite = "myjobmag";

export function listingPageUrl(page: number): string {
  if (page <= 1) return `${BASE}/jobs`;
  return `${BASE}/page/${page}`;
}

export async function scrapeListingPage(page: number): Promise<string[]> {
  const html = await fetchHtmlPage(listingPageUrl(page));
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const full = absoluteUrl(BASE, href);
    if (/myjobmag\.co\.ke\/job\/[^/]+/.test(full)) {
      urls.add(full.split("?")[0]!);
    }
  });
  return [...urls];
}

export async function scrapeJobDetail(url: string): Promise<ScrapedJobDraft | null> {
  const html = await fetchHtmlPage(url);
  const $ = cheerio.load(html);

  const title =
    $("h1").first().text().trim() ||
    $("title").text().split("|")[0]?.trim() ||
    "Untitled role";

  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";

  let companyName = "";
  $("a[href*='/jobs-at/']").each((_, el) => {
    const t = $(el).text().trim();
    if (t && !companyName) companyName = t;
  });
  if (!companyName) {
    const titleMatch = $("title").text().match(/at\s+([^|]+)/i);
    companyName = titleMatch?.[1]?.trim() ?? "Unknown employer";
  }

  const location =
    $(".job-location, .location, [class*='location']")
      .first()
      .text()
      .trim() || "Kenya";

  const bodyText =
    $("#job-details, .job-details, .job-description, article, .content")
      .first()
      .text()
      .trim() ||
    $("main").text().trim() ||
    metaDesc;

  const sections = parseMyJobMagSections($);
  const { description, requirements } = buildStructuredJobFields(
    sections,
    bodyText || metaDesc || `See full posting at ${url}`
  );
  const blob = `${title} ${description} ${requirements} ${location}`;

  const application = await extractApplication(SOURCE, $, url);

  return {
    sourceSite: SOURCE,
    externalJobId: externalIdFromUrl(url),
    externalUrl: application.applyUrl,
    sourceListingUrl: application.sourceListingUrl,
    applyViaSource: application.applyViaSource,
    title,
    companyName,
    location: location || "Kenya",
    description,
    requirements,
    locationType: inferLocationType(blob),
    employmentType: inferEmploymentType(blob),
  };
}
