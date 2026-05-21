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
  parseBrighterMondaySections,
} from "../parseJobSections";

const BASE = "https://www.brightermonday.co.ke";
const SOURCE: JobSourceSite = "brightermonday";

export function listingPageUrl(page: number): string {
  if (page <= 1) return `${BASE}/jobs`;
  return `${BASE}/jobs?page=${page}`;
}

export async function scrapeListingPage(page: number): Promise<string[]> {
  const html = await fetchHtmlPage(listingPageUrl(page));
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const full = absoluteUrl(BASE, href);
    if (/brightermonday\.co\.ke\/listings\/[^/]+/.test(full)) {
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
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "Untitled role";

  const companyName =
    $("[class*='company'], [data-testid*='company'], .employer")
      .first()
      .text()
      .trim() ||
    $("a[href*='/company']").first().text().trim() ||
    "Unknown employer";

  const location =
    $("[class*='location']").first().text().trim() ||
    $("meta[name='location']").attr("content")?.trim() ||
    "Kenya";

  const fallbackText =
    $("[class*='description'], article, main")
      .first()
      .text()
      .trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    `See full posting at ${url}`;

  const sections = parseBrighterMondaySections($);
  const { description, requirements } = buildStructuredJobFields(
    sections,
    fallbackText
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
