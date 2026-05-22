import type { Doc } from "@/convex/_generated/dataModel";
import { jobEmployerDisplayName } from "@/lib/aggregatedJob";
import { jobPageUrl, jobShouldIndex } from "@/lib/seo/jobMetadata";

const EMPLOYMENT_TYPE_SCHEMA: Record<
  Doc<"jobPostings">["employmentType"],
  string
> = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
};

function salarySchema(job: Doc<"jobPostings">) {
  if (job.salaryMin === undefined && job.salaryMax === undefined) {
    return undefined;
  }
  return {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      ...(job.salaryMin !== undefined ? { minValue: job.salaryMin } : {}),
      ...(job.salaryMax !== undefined ? { maxValue: job.salaryMax } : {}),
      unitText: "YEAR",
    },
  };
}

export default function JobPostingJsonLd({
  job,
  id,
}: {
  job: Doc<"jobPostings">;
  id: string;
}) {
  if (!jobShouldIndex(job)) return null;

  const employer = jobEmployerDisplayName(job);
  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: new Date(job._creationTime).toISOString(),
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.employmentType],
    hiringOrganization: employer
      ? {
          "@type": "Organization",
          name: employer,
        }
      : undefined,
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.location,
          },
        }
      : undefined,
    jobLocationType:
      job.locationType === "remote" ? "TELECOMMUTE" : undefined,
    baseSalary: salarySchema(job),
    url: jobPageUrl(id),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
