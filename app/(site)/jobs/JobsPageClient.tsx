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
import JobListingCard from "@/components/jobs/JobListingCard";
import { JobsInlineAdStrip, JobsSidebarAds } from "@/components/MarketingAdSlots";

export type JobsPageInitialFilters = {
  defaultSearch?: string;
  defaultLocation?: string;
  defaultLocationType?: LocationTypeFilter;
  defaultEmploymentType?: EmploymentTypeFilter;
};

export type JobsPageContentProps = JobsPageInitialFilters & {
  heading?: string;
  subheading?: string;
  initialResults?: Doc<"jobPostings">[];
  /** Server-rendered listing HTML for crawlers; hidden after client hydration. */
  seoFallback?: React.ReactNode;
};

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

export default function JobsPageClient(props: JobsPageContentProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-gray-900" />
        </div>
      }
    >
      <JobsPageContent {...props} />
    </Suspense>
  );
}

function JobsPageContent({
  defaultSearch = "",
  defaultLocation = "",
  defaultLocationType = "",
  defaultEmploymentType = "",
  heading = "Find your next role",
  subheading = "Search openings by title, location, or type — then save the ones you like.",
  initialResults,
  seoFallback,
}: JobsPageContentProps) {
  const { userId } = useAuth();

  useEffect(() => {
    const el = document.querySelector("[data-seo-job-list]");
    if (el) {
      el.setAttribute("hidden", "");
    }
  }, []);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState<LocationTypeFilter>("");
  const [employmentType, setEmploymentType] = useState<EmploymentTypeFilter>("");
  const [salaryFloor, setSalaryFloor] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [prioritizeFeatured, setPrioritizeFeatured] = useState(false);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? defaultSearch);
    setLocation(searchParams.get("location") ?? defaultLocation);
    setLocationType(
      parseLocationType(searchParams.get("locationType")) ||
        defaultLocationType
    );
    setEmploymentType(
      parseEmploymentType(searchParams.get("employmentType")) ||
        defaultEmploymentType
    );
  }, [
    searchParams,
    defaultSearch,
    defaultLocation,
    defaultLocationType,
    defaultEmploymentType,
  ]);

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

  const displayResults =
    status === "LoadingFirstPage" && initialResults?.length
      ? initialResults
      : results;

  return (
    <div className="min-h-screen bg-surface">
      <HomeHeader />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="min-w-0 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {heading}
          </h1>
          <p className="text-sm text-muted-foreground">
            {subheading}
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


        {seoFallback}

        <p className="text-xs text-muted-foreground mb-4">
          {status === "LoadingFirstPage" && !initialResults?.length
            ? "Loading..."
            : `${displayResults.length} result${displayResults.length !== 1 ? "s" : ""}`}
        </p>

        <div className="space-y-3">
          {displayResults.map((job, index) => (
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

        {status !== "LoadingFirstPage" && displayResults.length === 0 && (
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

        {status === "LoadingFirstPage" && !initialResults?.length && (
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
