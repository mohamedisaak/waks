"use client";

import {
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Fragment, Suspense, useEffect, useState } from "react";
import HomeHeader from "@/components/HomeHeader";
import { JobsInlineAdStrip, JobsSidebarAds } from "@/components/MarketingAdSlots";
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

function parseSalaryFloor(raw: string): number | undefined {
  const trimmed = raw.replace(/,/g, "").trim();
  if (!trimmed.length) return undefined;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

type LocationTypeFilter = "" | "remote" | "onsite" | "hybrid";
type EmploymentTypeFilter =
  | ""
  | "full-time"
  | "part-time"
  | "contract"
  | "internship";

function parseLocationType(raw: string | null): LocationTypeFilter {
  if (raw === "remote" || raw === "onsite" || raw === "hybrid") return raw;
  return "";
}

function parseEmploymentType(raw: string | null): EmploymentTypeFilter {
  if (
    raw === "full-time" ||
    raw === "part-time" ||
    raw === "contract" ||
    raw === "internship"
  ) {
    return raw;
  }
  return "";
}

function JobListingCard({ job }: { job: Doc<"jobPostings"> }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const aggregated = isAggregatedJob(job);
  const employer = jobEmployerDisplayName(job);
  return (
    <div className="bg-surface border border-border-strong rounded-2xl p-5 hover:border-border-strong hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#4CAF7D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-[#4CAF7D]"
            viewBox="0 0 20 20"
            fill="currentColor"
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
                {job.title}
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
                <svg
                  className="h-3 w-3 text-muted-foreground"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                {job.employmentType}
              </span>
              <span className="inline-flex items-center rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-muted">
                {job.locationType}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {salary && (
                <div className="flex items-center gap-1 text-sm font-semibold text-[#4CAF7D]">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.615zM10 .75a9.25 9.25 0 100 18.5A9.25 9.25 0 0010 .75zm-4.5 9.25a4.5 4.5 0 014.5-4.5v-.5a.75.75 0 011.5 0v.5a4.5 4.5 0 014.5 4.5.75.75 0 01-1.5 0 3 3 0 00-3-3v3.354l.449.137.05.016c.585.191 1.243.52 1.676.983.396.423.575.955.575 1.51 0 .555-.18 1.087-.575 1.51-.433.463-1.091.792-1.676.983l-.499.154v.488a.75.75 0 01-1.5 0v-.488l-.499-.154c-.585-.191-1.243-.52-1.676-.983C6.68 12.587 6.5 12.055 6.5 11.5c0-.555.18-1.087.575-1.51.433-.463 1.091-.792 1.676-.983l.05-.016.449-.137V5.5a3 3 0 00-3 3z" />
                  </svg>
                  {salary}
                </div>
              )}
              <Link
                href={`/jobs/${job._id}`}
                className="inline-flex items-center gap-1.5 bg-[#4CAF7D] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#3d9e6e] transition-colors"
              >
                Details
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-gray-900" />
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState<LocationTypeFilter>("");
  const [employmentType, setEmploymentType] = useState<EmploymentTypeFilter>("");
  const [salaryFloor, setSalaryFloor] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [prioritizeFeatured, setPrioritizeFeatured] = useState(false);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setLocation(searchParams.get("location") ?? "");
    setLocationType(parseLocationType(searchParams.get("locationType")));
    setEmploymentType(parseEmploymentType(searchParams.get("employmentType")));
  }, [searchParams]);

  const [alertName, setAlertName] = useState("");
  const [notifyDaily, setNotifyDaily] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [alertSaving, setAlertSaving] = useState(false);

  const salaryParsed = parseSalaryFloor(salaryFloor);

  const listArgs = {
    search: search.trim() || undefined,
    locationSubstring: location.trim() || undefined,
    locationType: locationType || undefined,
    employmentType: employmentType || undefined,
    ...(salaryParsed !== undefined
      ? { candidateMinSalary: salaryParsed }
      : {}),
    ...(sortOrder === "oldest" ? ({ sortOrder: "oldest" as const }) : {}),
    ...(prioritizeFeatured ? ({ prioritizeFeatured: true as const }) : {}),
  };

  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.listActive,
    listArgs,
    { initialNumItems: 20 }
  );

  const recommended = useQuery(
    api.jobs.listRecommended,
    userId ? { limit: 8 } : "skip"
  );
  const unreadNotifications = useQuery(
    api.jobAlerts.listUnreadNotifications,
    userId ? { limit: 12, kind: "job_alert" as const } : "skip"
  );
  const savedAlerts = useQuery(
    api.jobAlerts.listMine,
    userId ? {} : "skip"
  );

  const createAlert = useMutation(api.jobAlerts.create);
  const markNotificationsRead = useMutation(api.jobAlerts.markNotificationsRead);

  function resetFilters() {
    setSearch("");
    setLocation("");
    setLocationType("");
    setEmploymentType("");
    setSalaryFloor("");
    setSortOrder("newest");
    setPrioritizeFeatured(false);
  }

  async function handleDismissNotifications() {
    if (!userId || !unreadNotifications?.length) return;
    await markNotificationsRead({
      ids: unreadNotifications.map((n) => n._id),
    });
  }

  async function handleSaveAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!notifyDaily && !notifyWeekly) {
      alert("Enable at least one notification cadence (daily or weekly).");
      return;
    }
    setAlertSaving(true);
    try {
      await createAlert({
        name: alertName.trim() || "Saved search",
        search: search.trim() || undefined,
        locationSubstring: location.trim() || undefined,
        locationType: locationType || undefined,
        employmentType: employmentType || undefined,
        notifyDaily,
        notifyWeekly,
      });
      setAlertName("");
    } catch (err) {
      console.error(err);
      alert("Could not save alert. Try again.");
    } finally {
      setAlertSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <HomeHeader />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="min-w-0 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Find your next role
          </h1>
          <p className="text-sm text-muted-foreground">
            Search openings by title, location, or type — then save the ones
            you like.
          </p>
          {savedAlerts !== undefined && userId && (
            <p className="text-xs text-muted-foreground mt-2">
              You have{" "}
              <span className="font-semibold text-foreground-secondary">
                {savedAlerts.length}
              </span>{" "}
              saved {savedAlerts.length === 1 ? "alert" : "alerts"}.
            </p>
          )}
        </div>

        {userId &&
          unreadNotifications !== undefined &&
          unreadNotifications.length > 0 && (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Saved-search updates
                  </p>
                  <p className="text-xs text-amber-800/80">
                    Jobs that match alerts you subscribed to show up here.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-amber-950 dark:text-amber-100 underline underline-offset-2 hover:text-amber-800"
                  onClick={() => void handleDismissNotifications()}
                >
                  Dismiss all
                </button>
              </div>
              <ul className="space-y-2">
                {unreadNotifications.map((n) => (
                  <li key={n._id}>
                    <Link
                      href={n.linkPath ?? "/jobs"}
                      className="block rounded-xl bg-surface border border-amber-100 px-4 py-2.5 hover:border-amber-200 transition-colors"
                      onClick={() =>
                        void markNotificationsRead({ ids: [n._id] })
                      }
                    >
                      <p className="text-sm font-medium text-foreground">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{n.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

        <div className="bg-surface border border-border-strong rounded-2xl p-2 flex flex-wrap sm:flex-nowrap gap-2 mb-8 shadow-sm">
          <div className="flex-1 flex items-center gap-2 bg-surface-muted rounded-xl px-4 py-2.5 min-w-[160px]">
            <svg
              className="h-4 w-4 text-muted-foreground flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              placeholder="Title, company, or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground-secondary placeholder:text-muted-foreground focus:outline-none w-full"
            />
          </div>

          <div className="flex-1 flex items-center gap-2 bg-surface-muted rounded-xl px-4 py-2.5 min-w-[140px]">
            <svg
              className="h-4 w-4 text-muted-foreground flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433 5.73 5.73 0 00.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent text-sm text-foreground-secondary placeholder:text-muted-foreground focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface-muted rounded-xl px-4 py-2.5">
            <select
              value={locationType}
              onChange={(e) =>
                setLocationType(e.target.value as typeof locationType)
              }
              className="bg-transparent text-sm text-muted focus:outline-none cursor-pointer"
            >
              <option value="">Any workplace</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <svg
              className="h-3.5 w-3.5 text-muted-foreground"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-muted rounded-xl px-4 py-2.5">
            <select
              value={employmentType}
              onChange={(e) =>
                setEmploymentType(e.target.value as typeof employmentType)
              }
              className="bg-transparent text-sm text-muted focus:outline-none cursor-pointer"
            >
              <option value="">Any type</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <svg
              className="h-3.5 w-3.5 text-muted-foreground"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-8 text-sm">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Min salary (USD)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 120000"
              value={salaryFloor}
              onChange={(e) => setSalaryFloor(e.target.value)}
              className="rounded-xl border border-border-strong px-4 py-2 text-sm text-foreground-secondary w-44 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Sort by date
            </label>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "oldest")
              }
              className="rounded-xl border border-border-strong px-4 py-2 text-sm text-foreground-secondary bg-surface focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer min-w-[9rem]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={prioritizeFeatured}
              onChange={(e) => setPrioritizeFeatured(e.target.checked)}
              className="rounded border-border-strong"
            />
            <span className="text-sm text-foreground-secondary">Featured first</span>
          </label>
        </div>


        <p className="text-xs text-muted-foreground mb-4">
          {status === "LoadingFirstPage"
            ? "Loading..."
            : `${results.length} result${results.length !== 1 ? "s" : ""}`}
        </p>

        <div className="space-y-3">
          {results.map((job, index) => (
            <Fragment key={job._id}>
              <JobListingCard job={job} />
              {index === 2 ? <JobsInlineAdStrip /> : null}
            </Fragment>
          ))}
        </div>

        {status === "CanLoadMore" && (
          <div className="mt-8 text-center">
            <button
              onClick={() => loadMore(20)}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Load more jobs
            </button>
          </div>
        )}

        {status !== "LoadingFirstPage" && results.length === 0 && (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-surface-muted flex items-center justify-center mx-auto mb-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-muted font-medium mb-1">No jobs found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your filters or search terms.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-[#4CAF7D] font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {status === "LoadingFirstPage" && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-2xl p-5 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-surface-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-muted rounded w-1/3" />
                    <div className="h-3 bg-surface-muted rounded w-1/4" />
                    <div className="h-3 bg-surface-muted rounded w-3/4 mt-2" />
                    <div className="h-3 bg-surface-muted rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {userId && recommended !== undefined && recommended.length > 0 && (
          <section className="mt-14 pt-10 border-t border-border">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Recommended for your profile
              </h2>
              <Link
                href="/profile"
                className="text-xs text-[#4CAF7D] font-medium hover:underline whitespace-nowrap"
              >
                Update skills &amp; location
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {recommended.map((job) => (
                <JobListingCard key={job._id} job={job} />
              ))}
            </div>
          </section>
        )}

        {userId && (
          <form
            className="mt-10 rounded-2xl border border-border-strong bg-surface-muted/80 px-5 py-4 space-y-3"
            onSubmit={(e) => void handleSaveAlert(e)}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Save this search as an alert
                </p>
                <p className="text-xs text-muted">
                  Uses the keyword, location, workplace, and job type filters
                  above. Sign in required.
                </p>
              </div>
              <button
                type="submit"
                disabled={alertSaving}
                className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {alertSaving ? "Saving…" : "Save alert"}
              </button>
            </div>
            <input
              type="text"
              placeholder="Alert name"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              className="w-full max-w-md rounded-lg border border-border-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <div className="flex flex-wrap gap-4 text-xs text-foreground-secondary">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyDaily}
                  onChange={(e) => setNotifyDaily(e.target.checked)}
                  className="rounded border-border-strong"
                />
                Daily sweep
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyWeekly}
                  onChange={(e) => setNotifyWeekly(e.target.checked)}
                  className="rounded border-border-strong"
                />
                Weekly sweep
              </label>
            </div>
          </form>
        )}
          </div>
          <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-28 lg:self-start">
            <JobsSidebarAds />
          </aside>
        </div>
      </main>
    </div>
  );
}
