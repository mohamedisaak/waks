import type { JobSourceSite } from "./constants";

export type ScrapedJobDraft = {
  sourceSite: JobSourceSite;
  externalJobId: string;
  /** User-facing apply destination. */
  externalUrl: string;
  sourceListingUrl: string;
  applyViaSource: boolean;
  title: string;
  companyName: string;
  location: string;
  description: string;
  requirements: string;
  locationType: "onsite" | "remote" | "hybrid";
  employmentType:
    | "full-time"
    | "part-time"
    | "contract"
    | "internship";
  salaryMin?: number;
  salaryMax?: number;
};

export type IngestionCursor = {
  sourceIndex: number;
  page: number;
  urlOffset: number;
};
