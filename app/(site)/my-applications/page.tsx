"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, SignInButton, SignedOut } from "@clerk/nextjs";
import HomeHeader from "@/components/HomeHeader";
import {
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Star,
  Send,
  Undo2,
  CalendarDays,
  LayoutGrid,
  Table2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTickerNow } from "@/hooks/useTickerNow";
import {
  type AppStatus,
  STATUS_META,
  timeAgo,
  timelineStatusLabel,
  formatInterviewDate,
  formatShortDateTime,
  getLastActivity,
  sortApplicationsWithUnreadFirst,
  readApplicationsViewMode,
  MY_APPLICATIONS_VIEW_KEY,
  type ApplicationsViewMode,
} from "@/lib/applicationDisplay";

type MyApplication = Doc<"applications"> & {
  jobTitle: string;
  jobStatus: string;
  companyName: string;
  companyLogo?: string;
  jobLocation?: string;
  jobLocationType?: string;
  statusTimeline: Array<{
    at: number;
    from: AppStatus | null;
    to: AppStatus;
  }>;
  employerSeenAt?: number;
  scheduledInterviewAt?: number;
};

const STATUS_ICONS: Record<AppStatus, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  reviewed: <Eye className="h-3 w-3" />,
  shortlisted: <Star className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  hired: <CheckCircle2 className="h-3 w-3" />,
};

function buildUnreadMap(
  notifications: Doc<"jobSeekerNotifications">[]
): Map<string, { count: number; ids: Id<"jobSeekerNotifications">[] }> {
  const map = new Map<
    string,
    { count: number; ids: Id<"jobSeekerNotifications">[] }
  >();

  for (const n of notifications) {
    if (!n.applicationId) continue;
    const key = n.applicationId;
    const existing = map.get(key) ?? { count: 0, ids: [] };
    existing.count += 1;
    existing.ids.push(n._id);
    map.set(key, existing);
  }

  return map;
}

function useMarkNotificationsWhenVisible(
  unreadMap: Map<string, { count: number; ids: Id<"jobSeekerNotifications">[] }>,
  markNotificationsRead: (args: {
    ids: Id<"jobSeekerNotifications">[];
  }) => Promise<null>
) {
  const markedRef = useRef(new Set<string>());
  const observersRef = useRef(new Map<string, IntersectionObserver>());

  return useCallback(
    (applicationId: Id<"applications">, node: HTMLDivElement | null) => {
      const existing = observersRef.current.get(applicationId);
      if (existing) {
        existing.disconnect();
        observersRef.current.delete(applicationId);
      }

      if (!node) return;

      const entry = unreadMap.get(applicationId);
      if (!entry || markedRef.current.has(applicationId)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((e) => e.isIntersecting);
          if (!visible || markedRef.current.has(applicationId)) return;

          markedRef.current.add(applicationId);
          void markNotificationsRead({ ids: entry.ids });
          observer.disconnect();
          observersRef.current.delete(applicationId);
        },
        { threshold: 0.35 }
      );

      observersRef.current.set(applicationId, observer);
      observer.observe(node);
    },
    [unreadMap, markNotificationsRead]
  );
}

function StatusPill({ status }: { status: AppStatus }) {
  const cfg = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.className}`}
    >
      {STATUS_ICONS[status]}
      {cfg.label}
    </span>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ApplicationsViewMode;
  onChange: (view: ApplicationsViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border-strong p-0.5 bg-surface-muted">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          view === "cards"
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted hover:text-foreground-secondary"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          view === "table"
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted hover:text-foreground-secondary"
        }`}
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </button>
    </div>
  );
}

function ApplicationCard({
  app,
  nowMs,
  unreadCount,
  cardRef,
  onWithdraw,
}: {
  app: MyApplication;
  nowMs: number;
  unreadCount: number;
  cardRef: (node: HTMLDivElement | null) => void;
  onWithdraw: (id: Id<"applications">) => void;
}) {
  const status = app.status as AppStatus;
  const cfg = STATUS_META[status];
  const employerActed = status !== "pending";
  const lastActivity = getLastActivity(app);

  return (
    <div
      ref={cardRef}
      className={`bg-surface rounded-2xl border transition-all p-5 ${
        unreadCount > 0
          ? "border-[#4CAF7D]/40 ring-1 ring-[#4CAF7D]/10 shadow-sm"
          : "border-border hover:border-border-strong hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="font-semibold text-foreground truncate">
              {app.jobTitle}
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4CAF7D]/10 px-2 py-0.5 text-xs font-semibold text-[#3d9e6e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
                {unreadCount} new
              </span>
            )}
            {employerActed && status !== "rejected" && (
              <span className="inline-flex items-center gap-1 text-xs text-[#4CAF7D] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
                Employer replied
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {app.companyName && (
              <span className="font-medium text-muted">{app.companyName}</span>
            )}
            {app.jobLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {app.jobLocation}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Applied {timeAgo(app._creationTime, nowMs)}
            </span>
          </div>

          {lastActivity && (
            <p className="text-xs text-muted mt-2">
              Last update · {lastActivity.label} ·{" "}
              {timeAgo(lastActivity.at, nowMs)}
            </p>
          )}

          {typeof app.employerSeenAt === "number" && (
            <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-muted-foreground" />
              Employer opened your application{" "}
              {timeAgo(app.employerSeenAt, nowMs)} (
              {new Date(app.employerSeenAt).toLocaleDateString()})
            </p>
          )}

          {typeof app.scheduledInterviewAt === "number" && (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Interview scheduled
              </p>
              <p className="text-sm text-indigo-800 mt-0.5">
                {formatInterviewDate(app.scheduledInterviewAt)}
              </p>
            </div>
          )}

          {app.statusTimeline && app.statusTimeline.length > 0 && (
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer font-medium text-muted hover:text-foreground">
                Status timeline
              </summary>
              <ol className="mt-2 space-y-1.5 border-l border-border-strong pl-3 ml-1">
                {app.statusTimeline.map((step, idx) => {
                  const fromKey =
                    step.from === null ? "null" : (step.from as AppStatus);
                  const toKey = step.to as AppStatus;
                  return (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-gray-300 ring-4 ring-surface" />
                      <span className="text-foreground-secondary">
                        {timelineStatusLabel(fromKey)} →{" "}
                        {timelineStatusLabel(toKey)}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        · {formatShortDateTime(step.at)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </details>
          )}

          <p className="text-xs text-muted-foreground mt-2 italic">{cfg.hint}</p>

          {app.coverLetter && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 border-l-2 border-border-strong pl-3">
              {app.coverLetter}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <StatusPill status={status} />
          <Link
            href={`/jobs/${app.jobPostingId}`}
            className="text-xs text-muted-foreground hover:text-foreground-secondary underline underline-offset-2 transition-colors"
          >
            View job →
          </Link>
          <button
            type="button"
            onClick={() => onWithdraw(app._id)}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <Undo2 className="h-3 w-3" />
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationsTable({
  applications,
  nowMs,
  unreadByApplicationId,
  onRowClick,
}: {
  applications: MyApplication[];
  nowMs: number;
  unreadByApplicationId: Map<string, number>;
  onRowClick: (jobPostingId: Id<"jobPostings">) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted/80 text-left text-xs font-medium text-muted uppercase tracking-wide">
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3 hidden sm:table-cell">Company</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 hidden md:table-cell">Applied</th>
            <th className="px-4 py-3 hidden lg:table-cell">Interview</th>
            <th className="px-4 py-3 hidden md:table-cell">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {applications.map((app) => {
            const status = app.status as AppStatus;
            const unreadCount = unreadByApplicationId.get(app._id) ?? 0;
            const lastActivity = getLastActivity(app);

            return (
              <tr
                key={app._id}
                onClick={() => onRowClick(app.jobPostingId)}
                className="cursor-pointer hover:bg-surface-muted/80 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {unreadCount > 0 && (
                      <span
                        className="h-2 w-2 rounded-full bg-[#4CAF7D] shrink-0"
                        title={`${unreadCount} new update${unreadCount !== 1 ? "s" : ""}`}
                      />
                    )}
                    <span className="font-medium text-foreground truncate">
                      {app.jobTitle}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground sm:hidden mt-0.5 block truncate">
                    {app.companyName || "—"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-muted hidden sm:table-cell">
                  {app.companyName || "—"}
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={status} />
                </td>
                <td className="px-4 py-3.5 text-muted hidden md:table-cell whitespace-nowrap">
                  {timeAgo(app._creationTime, nowMs)}
                </td>
                <td className="px-4 py-3.5 text-muted hidden lg:table-cell whitespace-nowrap">
                  {typeof app.scheduledInterviewAt === "number"
                    ? formatInterviewDate(app.scheduledInterviewAt)
                    : "—"}
                </td>
                <td className="px-4 py-3.5 text-muted hidden md:table-cell">
                  {lastActivity ? (
                    <span className="line-clamp-2">{lastActivity.label}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MyApplicationsPage() {
  const nowMs = useTickerNow();
  const router = useRouter();
  const { userId } = useAuth();
  const [view, setView] = useState<ApplicationsViewMode>("cards");

  const applications = useQuery(
    api.applications.listMyApplications,
    userId ? {} : "skip"
  );
  const unreadNotifications = useQuery(
    api.jobAlerts.listUnreadNotifications,
    userId ? { limit: 100, kind: "application" as const } : "skip"
  );
  const markNotificationsRead = useMutation(api.jobAlerts.markNotificationsRead);
  const withdraw = useMutation(api.applications.withdrawMyApplication);

  useEffect(() => {
    setView(readApplicationsViewMode());
  }, []);

  useEffect(() => {
    localStorage.setItem(MY_APPLICATIONS_VIEW_KEY, view);
  }, [view]);

  const unreadMap = useMemo(
    () => buildUnreadMap(unreadNotifications ?? []),
    [unreadNotifications]
  );

  const unreadCountByApp = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [appId, entry] of unreadMap) {
      counts.set(appId, entry.count);
    }
    return counts;
  }, [unreadMap]);

  const sortedApplications = useMemo(() => {
    if (!applications) return [];
    return sortApplicationsWithUnreadFirst(
      applications as MyApplication[],
      unreadCountByApp
    );
  }, [applications, unreadCountByApp]);

  const attachCardRef = useMarkNotificationsWhenVisible(
    unreadMap,
    markNotificationsRead
  );

  async function handleWithdraw(applicationId: Id<"applications">) {
    if (
      !confirm(
        "Withdraw this application? The employer will no longer see it as active."
      )
    ) {
      return;
    }
    try {
      await withdraw({ applicationId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not withdraw.";
      alert(msg);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <HomeHeader />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
          <p className="text-sm text-muted mt-1">
            Track the status of every role you have applied to.
          </p>
        </div>

        <SignedOut>
          <div className="rounded-2xl border border-dashed border-border-strong p-12 text-center">
            <Send className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground-secondary mb-1">
              Sign in to see your applications
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              All the roles you apply to will appear here.
            </p>
            <SignInButton mode="modal">
              <button
                type="button"
                className="bg-[#4CAF7D] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#3d9e6e] transition-colors"
              >
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        {userId && applications === undefined && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        )}

        {userId && applications?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong p-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground-secondary mb-1">No applications yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Find a role you love and hit Submit application.
            </p>
            <Link
              href="/jobs"
              className="inline-block bg-[#4CAF7D] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#3d9e6e] transition-colors"
            >
              Browse jobs
            </Link>
          </div>
        )}

        {applications && applications.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="flex flex-wrap gap-4 text-sm text-muted">
                <span className="font-medium text-foreground-secondary">
                  {applications.length} application
                  {applications.length !== 1 ? "s" : ""}
                </span>
                {(
                  [
                    "pending",
                    "reviewed",
                    "shortlisted",
                    "hired",
                    "rejected",
                  ] as AppStatus[]
                ).map((s) => {
                  const count = applications.filter((a) => a.status === s).length;
                  if (!count) return null;
                  const cfg = STATUS_META[s];
                  return (
                    <span
                      key={s}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
                    >
                      {STATUS_ICONS[s]}
                      {count} {cfg.label}
                    </span>
                  );
                })}
              </div>
              <ViewToggle view={view} onChange={setView} />
            </div>

            {view === "cards" ? (
              sortedApplications.map((app) => (
                <ApplicationCard
                  key={app._id}
                  app={app}
                  nowMs={nowMs}
                  unreadCount={unreadCountByApp.get(app._id) ?? 0}
                  cardRef={(node) => attachCardRef(app._id, node)}
                  onWithdraw={handleWithdraw}
                />
              ))
            ) : (
              <ApplicationsTable
                applications={sortedApplications}
                nowMs={nowMs}
                unreadByApplicationId={unreadCountByApp}
                onRowClick={(jobPostingId) =>
                  router.push(`/jobs/${jobPostingId}`)
                }
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
