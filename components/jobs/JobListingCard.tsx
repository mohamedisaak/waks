import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  aggregatedSourceLabel,
  isAggregatedJob,
  jobEmployerDisplayName,
  shouldShowSourceAttribution,
} from "@/lib/aggregatedJob";

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} USD`;
  if (min) return `From ${fmt(min)} USD`;
  if (max) return `Up to ${fmt(max)} USD`;
  return null;
}

export default function JobListingCard({ job }: { job: Doc<"jobPostings"> }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const aggregated = isAggregatedJob(job);
  const employer = jobEmployerDisplayName(job);

  return (
    <article className="bg-surface border border-border-strong rounded-2xl p-5 hover:border-border-strong hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#4CAF7D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-[#4CAF7D]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 14.197l-4.419 2.617A1 1 0 014 16V4z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-foreground text-base leading-tight">
                <Link href={`/jobs/${job._id}`} className="hover:underline">
                  {job.title}
                </Link>
              </h2>
              {employer && (
                <p className="text-sm text-foreground-secondary mt-0.5">
                  {employer}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {aggregated && shouldShowSourceAttribution(job) && (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                    External · {aggregatedSourceLabel(job)}
                  </span>
                )}
                {job.featured && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                    ★
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{job.location}</span>
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433 5.73 5.73 0 00.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {job.locationType === "remote"
                    ? "Remote"
                    : job.locationType === "onsite"
                      ? "On-site"
                      : "Hybrid"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">
            {job.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-muted">
                {job.employmentType}
              </span>
              <span className="inline-flex items-center rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-muted">
                {job.locationType}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {salary && (
                <div className="flex items-center gap-1 text-sm font-semibold text-[#4CAF7D]">
                  {salary}
                </div>
              )}
              <Link
                href={`/jobs/${job._id}`}
                className="inline-flex items-center gap-1.5 bg-[#4CAF7D] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#3d9e6e] transition-colors"
              >
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
