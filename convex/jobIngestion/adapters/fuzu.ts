import * as cheerio from "cheerio";
import type { JobSourceSite } from "../constants";
import type { ScrapedJobDraft } from "../types";
import {
  absoluteUrl,
  externalIdFromUrl,
  inferEmploymentType,
  inferLocationType,
  truncateStructuredMarkdown,
} from "../heuristics";
import { fetchHtmlPage } from "../fetchHtml";

const BASE = "https://www.fuzu.com";
const SOURCE: JobSourceSite = "fuzu";

export function listingPageUrl(page: number): string {
  const pageIndex = Math.max(0, page - 1);
  return `${BASE}/kenya/job?filters[country_id]=1&page=${pageIndex}`;
}

export async function scrapeListingPage(page: number): Promise<string[]> {
  const html = await fetchHtmlPage(listingPageUrl(page));
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const full = absoluteUrl(BASE, href);
    if (/fuzu\.com\/kenya\/jobs\/[^/?#]+/.test(full)) {
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
    $("[class*='company'], [class*='employer']")
      .first()
      .text()
      .trim() || "Unknown employer";

  const location =
    $("[class*='location']").first().text().trim() || "Kenya";

  const bodyText =
    $("main, article, [class*='description']")
      .first()
      .text()
      .trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    `See full posting at ${url}`;

  const description = truncateStructuredMarkdown(
    `## Job Description\n\n${bodyText.replace(/\s+/g, " ").trim()}`
  );

  const blob = `${title} ${description} ${location}`;

  return {
    sourceSite: SOURCE,
    externalJobId: externalIdFromUrl(url),
    externalUrl: url,
    sourceListingUrl: url,
    applyViaSource: true,
    title,
    companyName,
    location: location || "Kenya",
    description,
    requirements:
      "See job description. Full requirements on the original listing.",
    locationType: inferLocationType(blob),
    employmentType: inferEmploymentType(blob),
  };
}
