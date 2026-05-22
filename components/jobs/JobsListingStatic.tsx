import type { Doc } from "@/convex/_generated/dataModel";
import JobListingCard from "./JobListingCard";

type JobsListingStaticProps = {
  jobs: Doc<"jobPostings">[];
  /** Visually hidden heading for crawlers when the visible H1 lives in the client shell. */
  srOnlyTitle?: string;
};

/** Server-rendered job cards for SEO and no-JS users. */
export default function JobsListingStatic({
  jobs,
  srOnlyTitle = "Latest job openings",
}: JobsListingStaticProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={srOnlyTitle}
      className="space-y-3 mb-8"
      data-seo-job-list
    >
      <h2 className="sr-only">{srOnlyTitle}</h2>
      <ul className="space-y-3 list-none p-0 m-0">
        {jobs.map((job) => (
          <li key={job._id}>
            <JobListingCard job={job} />
          </li>
        ))}
      </ul>
    </section>
  );
}
