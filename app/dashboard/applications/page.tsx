"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import {
  canAdvanceToPremiumPipelineStages,
  canUseEmployerNotes,
  canUseInterviewScheduling,
  canUseOutboundWebhooks,
  canUseRecruitingProductivityPack,
  canUseTalentPool,
  canTrackEmployerApplicationViews,
} from "@/lib/orgPlan";
import {
  statusDangerBadge,
  statusInfoBadge,
  statusInfoButton,
  statusSuccessBadge,
} from "@/lib/themeClasses";

const STATUS_OPTIONS = [
  "pending",
  "reviewed",
  "shortlisted",
  "rejected",
  "hired",
] as const;
type ApplicationStatus = (typeof STATUS_OPTIONS)[number];

type OrgApplicationRow = Doc<"applications"> & {
  jobTitle: string;
  pipelineOrder?: Doc<"jobPostings">["pipelineOrder"];
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending:
    "rounded-full px-2 py-0.5 text-xs font-medium bg-surface-muted text-muted border border-border",
  reviewed: statusInfoBadge,
  shortlisted:
    "rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/50",
  rejected: statusDangerBadge,
  hired: statusSuccessBadge,
};

function csvEscape(cell: string) {
  const s = cell.replace(/"/g, '""');
  return `"${s}"`;
}

function buildGoogleCalendarUrl(opts: {
  title: string;
  startMs: number;
  details?: string;
}) {
  const pad = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "").slice(0, 15);
  const start = pad(new Date(opts.startMs));
  const end = pad(new Date(opts.startMs + 45 * 60 * 1000));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${start}Z/${end}Z`,
  });
  if (opts.details) params.set("details", opts.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function ResumeDownload({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.applications.getResumeUrl, { storageId });
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary bg-surface border border-border-strong rounded-md px-3 py-1.5 hover:border-slate-400"
    >
      Download Resume →
    </a>
  );
}

function ApplicationCard({
  app,
  expanded,
  onToggle,
  orgId,
  hasATSStages,
  canProdPack,
  canNotes,
  canTrackViews,
  canInterview,
  canPool,
}: {
  app: OrgApplicationRow;
  expanded: boolean;
  onToggle: () => void;
  orgId: string;
  hasATSStages: boolean;
  canProdPack: boolean;
  canNotes: boolean;
  canTrackViews: boolean;
  canInterview: boolean;
  canPool: boolean;
}) {
  const markOpened = useMutation(api.applications.markEmployerOpened);
  const savePool = useMutation(api.talentPool.saveCandidate);
  const updateTags = useMutation(api.applications.updateApplicationTags);
  const addNote = useMutation(api.applications.addNote);
  const setInterview = useMutation(api.applications.setInterview);
  const history = useQuery(
    api.applications.listStatusHistory,
    expanded && orgId
      ? { applicationId: app._id, clerkOrgId: orgId }
      : "skip"
  );
  const notes = useQuery(
    api.applications.listNotes,
    expanded && canNotes && orgId
      ? { applicationId: app._id, clerkOrgId: orgId }
      : "skip"
  );

  const openedOnce = useRef(false);
  const [tagsDraft, setTagsDraft] = useState(
    (app.tags ?? []).join(", ")
  );
  const [noteBody, setNoteBody] = useState("");
  const [replyToNoteId, setReplyToNoteId] = useState<string | null>(null);
  const [interviewLocal, setInterviewLocal] = useState(() => {
    if (!app.scheduledInterviewAt) return "";
    return new Date(app.scheduledInterviewAt).toISOString().slice(0, 16);
  });

  useEffect(() => {
    setTagsDraft((app.tags ?? []).join(", "));
  }, [app.tags]);

  useEffect(() => {
    setInterviewLocal(
      app.scheduledInterviewAt
        ? new Date(app.scheduledInterviewAt).toISOString().slice(0, 16)
        : ""
    );
  }, [app.scheduledInterviewAt]);

  useEffect(() => {
    if (!expanded || !canTrackViews || !orgId) return;
    if (openedOnce.current) return;
    openedOnce.current = true;
    void markOpened({
      applicationId: app._id,
      clerkOrgId: orgId,
    }).catch(() => {});
  }, [expanded, canTrackViews, orgId, app._id, markOpened]);

  const updateStatus = useMutation(api.applications.updateStatus);

  async function handleStage(s: ApplicationStatus) {
    if (!orgId) return;
    await updateStatus({
      id: app._id,
      clerkOrgId: orgId,
      status: s,
    });
  }

  async function handleSaveTags() {
    if (!orgId) return;
    const tags = tagsDraft.split(",").map((t) => t.trim()).filter(Boolean);
    await updateTags({
      applicationId: app._id,
      clerkOrgId: orgId,
      tags,
    });
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !noteBody.trim()) return;
    await addNote({
      applicationId: app._id,
      clerkOrgId: orgId,
      body: noteBody,
      parentNoteId: replyToNoteId
        ? (replyToNoteId as import("@/convex/_generated/dataModel").Id<"applicationNotes">)
        : undefined,
    });
    setNoteBody("");
    setReplyToNoteId(null);
  }

  const topLevelNotes = (notes ?? []).filter((n) => !n.parentNoteId);
  const repliesByParent = (notes ?? []).reduce(
    (acc, n) => {
      if (!n.parentNoteId) return acc;
      const list = acc[n.parentNoteId] ?? [];
      list.push(n);
      acc[n.parentNoteId] = list;
      return acc;
    },
    {} as Record<string, NonNullable<typeof notes>>
  );

  async function handleInterviewSave() {
    if (!orgId) return;
    if (!interviewLocal) {
      await setInterview({
        applicationId: app._id,
        clerkOrgId: orgId,
        scheduledInterviewAt: null,
      });
      return;
    }
    const ms = new Date(interviewLocal).getTime();
    await setInterview({
      applicationId: app._id,
      clerkOrgId: orgId,
      scheduledInterviewAt: ms,
    });
  }

  return (
    <div className="bg-surface rounded-xl border border-border-strong overflow-hidden">
      <div
        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-canvas select-none"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="font-semibold text-foreground truncate">
              {app.applicantName}
            </p>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status]}`}
            >
              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
            </span>
            {(app.tags?.length ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground">
                {app.tags?.join(" · ")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted truncate">
            {app.applicantEmail} · Applied for:{" "}
            <span className="font-medium text-foreground-secondary">{app.jobTitle}</span>
          </p>
          {typeof app.firstOpenedByEmployerAt === "number" && (
            <p className="text-xs text-muted-foreground mt-1">
              Opened{" "}
              {new Date(app.firstOpenedByEmployerAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {new Date(app._creationTime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
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

      {expanded && (
        <div className="border-t border-border p-5 space-y-4 bg-canvas">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Email</p>
              <a
                href={`mailto:${app.applicantEmail}`}
                className="text-foreground-secondary underline hover:text-foreground"
              >
                {app.applicantEmail}
              </a>
            </div>
            {app.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                <p className="text-foreground-secondary">{app.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Applied for</p>
              <p className="text-foreground-secondary font-medium">{app.jobTitle}</p>
            </div>
          </div>

          {app.coverLetter && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Cover Letter</p>
              <p className="text-sm text-muted whitespace-pre-wrap bg-surface rounded-lg border border-border-strong p-4 leading-relaxed">
                {app.coverLetter}
              </p>
            </div>
          )}

          {app.resumeStorageId && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Resume</p>
              <ResumeDownload
                storageId={app.resumeStorageId as Id<"_storage">}
              />
            </div>
          )}

          {app.screeningAnswers && app.screeningAnswers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Screening</p>
              <ul className="space-y-1 text-sm text-muted bg-surface border border-border-strong rounded-lg p-3">
                {app.screeningAnswers.map((a, i) => (
                  <li key={a.questionId}>
                    <span className="font-medium text-slate-800">
                      Q{i + 1}:{" "}
                    </span>
                    {a.answer}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {history && history.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status timeline</p>
              <ul className="text-xs text-muted space-y-1">
                {history
                  .slice()
                  .sort((a, b) => a._creationTime - b._creationTime)
                  .map((row) => (
                    <li key={row._id}>
                      {new Date(row._creationTime).toLocaleString()}:{" "}
                      {(row.fromStatus ?? "created") +
                        ` → ${row.toStatus}`}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {hasATSStages
                ? "Move to stage"
                : "Stages like shortlisted & hired are on Pro"}
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => {
                const premium = s === "shortlisted" || s === "hired";
                const disabled = premium && !hasATSStages;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disabled) return;
                      void handleStage(s);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      app.status === s
                        ? STATUS_STYLES[s] + " border-transparent"
                        : disabled
                          ? "bg-surface text-muted-foreground border-border cursor-not-allowed"
                          : "bg-surface text-muted border-border-strong hover:border-slate-400 cursor-pointer"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {canProdPack && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={tagsDraft}
                  onChange={(e) => setTagsDraft(e.target.value)}
                  placeholder="comma separated labels"
                  className="flex-1 min-w-[180px] text-sm rounded-md border border-border-strong px-3 py-1.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSaveTags();
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-900 text-white"
                >
                  Save tags
                </button>
              </div>
            </div>
          )}

          {canInterview && (
            <div className="bg-surface rounded-lg border border-border-strong p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Interview slot</p>
              <input
                type="datetime-local"
                value={interviewLocal}
                onChange={(e) => setInterviewLocal(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-sm border border-border-strong rounded-md px-2 py-1"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleInterviewSave();
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save time
                </button>
                {app.scheduledInterviewAt && (
                  <a
                    href={buildGoogleCalendarUrl({
                      title: `Interview — ${app.applicantName} (${app.jobTitle})`,
                      startMs: app.scheduledInterviewAt,
                      details: `Candidate: ${app.applicantEmail}`,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border-strong text-foreground-secondary hover:bg-canvas"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Add to Google Calendar
                  </a>
                )}
              </div>
            </div>
          )}

          {canNotes && notes !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Team notes</p>
              <p className="text-[11px] text-muted-foreground mb-2">
                Use @email@company.com to notify a teammate by email.
              </p>
              <ul className="space-y-2 mb-3">
                {topLevelNotes.length === 0 && (
                  <li className="text-xs text-muted-foreground">No notes yet.</li>
                )}
                {topLevelNotes.map((n) => (
                  <li key={n._id} className="space-y-1">
                    <div className="text-sm text-foreground-secondary bg-surface border border-border-strong rounded-md p-2">
                      <p>{n.body}</p>
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-purple-700 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyToNoteId(n._id);
                        }}
                      >
                        Reply
                      </button>
                    </div>
                    {(repliesByParent[n._id] ?? []).map((r) => (
                      <div
                        key={r._id}
                        className="ml-4 text-sm text-muted bg-canvas border border-border rounded-md p-2"
                      >
                        {r.body}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
              {replyToNoteId && (
                <p className="text-[11px] text-purple-700 mb-1">
                  Replying…{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyToNoteId(null);
                    }}
                  >
                    Cancel
                  </button>
                </p>
              )}
              <form className="flex gap-2" onSubmit={handleAddNote}>
                <input
                  type="text"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder={
                    replyToNoteId
                      ? "Write a reply…"
                      : "Add a note (@email to mention)"
                  }
                  className="flex-1 text-sm rounded-md border border-border-strong px-3 py-1.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-purple-700 text-white"
                >
                  {replyToNoteId ? "Reply" : "Add"}
                </button>
              </form>
            </div>
          )}

          {!canNotes && (
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Upgrade to Pro for internal notes about candidates.
            </p>
          )}

          {canPool && (
            <button
              type="button"
              className={statusInfoButton}
              onClick={(e) => {
                e.stopPropagation();
                void savePool({
                  clerkOrgId: orgId,
                  applicationId: app._id,
                });
              }}
            >
              Save to talent pool
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardApplicationsPage() {
  const { orgId, has } = useAuth();
  const now = useTickerNow();
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const tierFromConvex = useOrgAccessTier(convexOrg ?? undefined, now);

  const tierProFromClerk = has?.({ plan: "pro" }) ?? false;

  const hasATSStages =
    (tierFromConvex !== undefined &&
      canAdvanceToPremiumPipelineStages(tierFromConvex)) ||
    tierProFromClerk ||
    (has?.({ feature: "applicant_tracking" }) ?? false);

  const canProdPack =
    tierFromConvex !== undefined &&
    canUseRecruitingProductivityPack(tierFromConvex);

  const canNotesTier =
    tierFromConvex !== undefined && canUseEmployerNotes(tierFromConvex);

  const canViewsTier =
    tierFromConvex !== undefined &&
    canTrackEmployerApplicationViews(tierFromConvex);

  const canInterviewTier =
    tierFromConvex !== undefined &&
    canUseInterviewScheduling(tierFromConvex);

  const canPoolTier =
    tierFromConvex !== undefined && canUseTalentPool(tierFromConvex);

  const canWebhookTier =
    tierFromConvex !== undefined && canUseOutboundWebhooks(tierFromConvex);

  const applications = useQuery(
    api.applications.listByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const bulkUpdateStatus = useMutation(api.applications.bulkUpdateStatus);

  const [filter, setFilter] = useState<ApplicationStatus | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = applications?.filter(
    (a) => !filter || a.status === filter
  ) as OrgApplicationRow[] | undefined;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    if (!filtered) return;
    setSelected(new Set(filtered.map((a) => a._id)));
  }

  async function bulkTo(status: ApplicationStatus) {
    if (!orgId) return;
    await bulkUpdateStatus({
      clerkOrgId: orgId,
      ids: [...selected].map((id) => id as Id<"applications">),
      status,
    });
    setSelected(new Set());
  }

  function downloadCsv() {
    if (!filtered?.length) return;
    const header = [
      "name",
      "email",
      "jobTitle",
      "status",
      "appliedAt",
      "tags",
      "screeningAnswers",
    ];
    const lines = [header.join(",")];
    for (const row of filtered) {
      const screening =
        row.screeningAnswers?.map((a) => `${a.questionId}:${a.answer}`).join("; ") ??
        "";
      lines.push(
        [
          csvEscape(row.applicantName),
          csvEscape(row.applicantEmail),
          csvEscape(row.jobTitle ?? ""),
          csvEscape(row.status),
          csvEscape(new Date(row._creationTime).toISOString()),
          csvEscape((row.tags ?? []).join("; ")),
          csvEscape(screening),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `waks-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const upgradePromptVisible = useMemo(
    () => !hasATSStages,
    [hasATSStages]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted mt-0.5">
            {applications !== undefined
              ? `${applications.length} total application${applications.length !== 1 ? "s" : ""}`
              : "Loading..."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <Link
              href="/dashboard/applications/board"
              className="rounded-md px-3 py-1.5 bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              Pipeline board
            </Link>
            {canWebhookTier && (
              <Link
                href="/dashboard/integrations"
                className="rounded-md px-3 py-1.5 border border-border-strong text-foreground-secondary hover:bg-canvas"
              >
                Webhooks
              </Link>
            )}
            {canPoolTier && (
              <Link
                href="/dashboard/talent-pool"
                className="rounded-md px-3 py-1.5 border border-border-strong text-foreground-secondary hover:bg-canvas"
              >
                Talent pool
              </Link>
            )}
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ApplicationStatus | "")}
          className="border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-surface"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {upgradePromptVisible && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground text-sm">
              Unlock shortlist & hired on Pro
            </p>
            <p className="text-xs text-muted mt-0.5">
              Starter unlocks tagging, CSV, and bulk edits. Pro completes the ATS.
            </p>
          </div>
          <Link
            href="/employers/pricing"
            className="flex-shrink-0 text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 rounded-md px-3 py-1.5 hover:bg-purple-200"
          >
            Upgrade →
          </Link>
        </div>
      )}

      {canProdPack && filtered && filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-strong bg-surface px-4 py-3">
          <button
            type="button"
            onClick={selectVisible}
            className="text-xs font-semibold text-foreground-secondary underline"
          >
            Select visible
          </button>
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => void bulkTo("reviewed")}
            disabled={selected.size === 0}
            className="text-xs px-3 py-1 rounded-md bg-surface-muted border border-border-strong text-foreground disabled:opacity-40"
          >
            Bulk → Reviewed
          </button>
          <button
            type="button"
            onClick={() => void bulkTo("pending")}
            disabled={selected.size === 0}
            className="text-xs px-3 py-1 rounded-md bg-surface-muted border border-border-strong text-foreground disabled:opacity-40"
          >
            Bulk → Pending
          </button>
          {hasATSStages && (
            <>
              <button
                type="button"
                onClick={() => void bulkTo("shortlisted")}
                disabled={selected.size === 0}
                className="text-xs px-3 py-1 rounded-md bg-purple-50 border border-purple-200 disabled:opacity-40"
              >
                Bulk → Shortlisted
              </button>
              <button
                type="button"
                onClick={() => void bulkTo("rejected")}
                disabled={selected.size === 0}
                className="text-xs px-3 py-1 rounded-md bg-red-50 border border-red-100 disabled:opacity-40"
              >
                Bulk → Rejected
              </button>
            </>
          )}
          <button
            type="button"
            onClick={downloadCsv}
            className="text-xs px-3 py-1 rounded-md bg-green-700 text-white font-semibold"
          >
            Export CSV
          </button>
        </div>
      )}

      {applications === undefined && (
        <div className="text-sm text-muted-foreground py-8 text-center animate-pulse">
          Loading applications...
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-border-strong bg-surface">
          <p className="text-muted">
            {filter
              ? `No ${filter} applications.`
              : "No applications yet. Share your job postings to start receiving candidates."}
          </p>
          {!filter && (
            <Link
              href="/dashboard/jobs"
              className="mt-3 inline-block text-sm text-muted underline hover:text-foreground"
            >
              View your jobs →
            </Link>
          )}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((app) => {
            const expanded = expandedId === app._id;
            return (
              <div key={app._id} className="flex gap-2 items-start">
                {canProdPack && (
                  <input
                    type="checkbox"
                    className="mt-6 ml-2 h-4 w-4 shrink-0"
                    checked={selected.has(app._id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(app._id)}
                  />
                )}
                <div className="flex-1">
                  <ApplicationCard
                    app={app}
                    expanded={expanded}
                    onToggle={() =>
                      setExpandedId(expanded ? null : app._id)
                    }
                    orgId={orgId ?? ""}
                    hasATSStages={hasATSStages}
                    canProdPack={canProdPack}
                    canNotes={canNotesTier}
                    canTrackViews={canViewsTier}
                    canInterview={canInterviewTier}
                    canPool={canPoolTier}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
