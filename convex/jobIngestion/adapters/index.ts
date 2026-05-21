import type { JobSourceSite } from "../constants";
import type { ScrapedJobDraft } from "../types";
import * as brightermonday from "./brightermonday";
import * as fuzu from "./fuzu";
import * as myjobmag from "./myjobmag";

export function listingPageUrl(source: JobSourceSite, page: number): string {
  switch (source) {
    case "brightermonday":
      return brightermonday.listingPageUrl(page);
    case "myjobmag":
      return myjobmag.listingPageUrl(page);
    case "fuzu":
      return fuzu.listingPageUrl(page);
  }
}

export async function scrapeListingPage(
  source: JobSourceSite,
  page: number
): Promise<string[]> {
  switch (source) {
    case "brightermonday":
      return brightermonday.scrapeListingPage(page);
    case "myjobmag":
      return myjobmag.scrapeListingPage(page);
    case "fuzu":
      return fuzu.scrapeListingPage(page);
  }
}

export async function scrapeJobDetail(
  source: JobSourceSite,
  url: string
): Promise<ScrapedJobDraft | null> {
  switch (source) {
    case "brightermonday":
      return brightermonday.scrapeJobDetail(url);
    case "myjobmag":
      return myjobmag.scrapeJobDetail(url);
    case "fuzu":
      return fuzu.scrapeJobDetail(url);
  }
}
