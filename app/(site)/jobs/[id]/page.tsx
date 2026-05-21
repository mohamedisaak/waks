"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState, use, useEffect, useRef } from "react";
import HomeHeader from "@/components/HomeHeader";
import { useManagementNav } from "@/hooks/useManagementNav";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { MapPin, Briefcase, ChevronDown, ChevronUp, Pencil, Send, CheckCircle2, Building2, ExternalLink } from "lucide-react";
import JobBodySections from "@/components/JobBodySections";
import {
  aggregatedApplyButtonLabel,
  aggregatedApplyCardDescription,
  aggregatedApplyCardTitle,
  aggregatedSourceLabel,
  isAggregatedJob,
  jobEmployerDisplayName,
  shouldShowAggregatedApplyAttribution,
  shouldShowAggregatedApplyCard,
} from "@/lib/aggregatedJob";
import { collectJobDisplaySections } from "@/lib/jobBodySections";

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} USD`;
  if (min) return `From ${fmt(min)} USD`;
  if (max) return `Up to ${fmt(max)} USD`;
  return null;
}

const LOCATION_LABELS: Record<string, string> = {
  remote: "remote",
  onsite: "on-site",
  hybrid: "hybrid",
};

function ProfileInitial({ name }: { name: string }) {
  const initial = name?.charAt(0).toUpperCase() ?? "?";
  return (
    <div className="h-9 w-9 rounded-full bg-surface-muted flex items-center justify-center text-sm font-semibold text-muted flex-shrink-0">
      {initial}
    </div>
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const { paths } = useManagementNav();

  const job = useQuery(api.jobs.getByIdPublic, { id: id as Id<"jobPostings"> });
  const profileSummary = useQuery(api.profiles.getMyProfileSummary);
  const myApplication = useQuery(api.applications.getMyApplication, {
    jobPostingId: id as Id<"jobPostings">,
  });

  const [profileExpanded, setProfileExpanded] = useState(true);
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const hasRecordedViewRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const applyWithProfileMutation = useMutation(api.applications.applyWithProfile);
  const updateNotificationPrefs = useMutation(
    api.notifications.preferences.updateMyPreferences
  );
  const recordJobViewMutation = useMutation(api.jobs.recordJobView);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate screening defaults when Convex job id changes */
    if (job === undefined || job === null) return;
    const qs = job.screeningQuestions ?? [];
    if (qs.length === 0) {
      setAnswers({});
      return;
    }
    setAnswers(Object.fromEntries(qs.map((q) => [q.id, ""])));
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only reset when navigating to another posting
  }, [job?._id]);

  useEffect(() => {
    if (job === undefined || job === null) return;
    if (job.status !== "active" || hasRecordedViewRef.current) return;
    hasRecordedViewRef.current = true;
    void recordJobViewMutation({ jobPostingId: job._id });
  }, [job, recordJobViewMutation]);

  async function handleApply() {
    if (job === undefined || job === null) return;
    setSubmitting(true);
    try {
      if (whatsappOptIn && whatsappPhone.trim()) {
        await updateNotificationPrefs({
          whatsappOptIn: true,
          whatsappPhone: whatsappPhone.trim(),
        });
      }

      const screeningQuestions = job.screeningQuestions ?? [];
      await applyWithProfileMutation({
        jobPostingId: id as Id<"jobPostings">,
        coverLetter: coverLetter.trim() || undefined,
        callerClerkOrgId: organization?.id,
        screeningAnswers:
          screeningQuestions.length > 0
            ? screeningQuestions.map((q) => ({
                questionId: q.id,
                answer: (answers[q.id] ?? "").trim(),
              }))
            : undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit application.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (job === undefined) {
    return (
      <>
        <HomeHeader />
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
        </div>
      </>
    );
  }

  if (job === null) {
    return (
      <>
        <HomeHeader />
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4">
          <p className="text-muted">Job posting not found.</p>
          <Link href="/jobs" className="text-sm text-foreground underline">
            ← Back to all jobs
          </Link>
        </div>
      </>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const isActive = job.status === "active";
  const aggregated = isAggregatedJob(job);
  const showAggregatedApplyCard =
    aggregated && shouldShowAggregatedApplyCard(job);
  const showApplySidebar = !aggregated || showAggregatedApplyCard;
  const jobBodySections = collectJobDisplaySections(
    job.description,
    job.requirements
  );
  const employerName =
    jobEmployerDisplayName(job) ?? job.organization?.name ?? null;
  const alreadyApplied = !!myApplication || submitted;
  const isOwnOrgJob = !!organization && organization.id === job.clerkOrgId;

  const hasProfile =
    profileSummary &&
    (profileSummary.name || profileSummary.headline);

  return (
    <>
      <HomeHeader />
      <main className="min-h-screen bg-canvas">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
          >
            ← Back to all jobs
          </Link>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── Left: job details ── */}
            <div className="flex-1 min-w-0">
              <div className="bg-surface rounded-2xl border border-border-strong p-7">
                {/* Tags row */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {LOCATION_LABELS[job.locationType] && (
                    <span className="rounded-full border border-border-strong bg-canvas px-3 py-0.5 text-xs text-muted">
                      {LOCATION_LABELS[job.locationType]}
                    </span>
                  )}
                  <span className="rounded-full border border-border-strong bg-canvas px-3 py-0.5 text-xs text-muted">
                    {job.employmentType}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {job.title}
                </h1>

                {/* Company + location */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted mb-4">
                  {employerName && (
                    <span className="font-medium text-foreground-secondary">
                      {employerName}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  )}
                </div>

                {/* Salary */}
                {salary && (
                  <p className="text-lg font-semibold text-foreground mb-6">
                    {salary}
                  </p>
                )}

                {/* Structured job body (scraped sections or legacy flat text) */}
                <JobBodySections sections={jobBodySections} />

                {aggregated && shouldShowAggregatedApplyAttribution(job) && (
                  <p className="text-xs text-muted border-t border-border pt-4 mt-2">
                    Listing sourced from {aggregatedSourceLabel(job)}. Apply on
                    the original site for the authoritative posting.
                  </p>
                )}

              </div>

              {/* Bottom nav */}
              <div className="flex items-center gap-4 mt-4 px-1">
                <Link
                  href="/jobs"
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
                >
                  <Briefcase className="h-4 w-4" />
                  All jobs
                </Link>
              </div>
            </div>

            {/* ── Right: apply card ── */}
            {showApplySidebar && (
            <div className="w-full lg:w-[340px] flex-shrink-0 lg:sticky lg:top-6">
              {showAggregatedApplyCard ? (
                <div className="bg-surface rounded-2xl border border-border-strong p-6 space-y-4">
                  <h2 className="font-semibold text-foreground text-base">
                    {aggregatedApplyCardTitle(job)}
                  </h2>
                  <p className="text-sm text-muted">
                    {aggregatedApplyCardDescription(job)}
                  </p>
                  <a
                    href={job.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d9b6f] text-white text-sm font-medium py-2.5 hover:bg-[#257d5a] transition-colors"
                  >
                    {aggregatedApplyButtonLabel(job)}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : !isActive ? (
                <div className="bg-surface rounded-2xl border border-border-strong p-6">
                  <p className="text-sm text-muted-foreground italic text-center">
                    This position is no longer accepting applications.
                  </p>
                </div>
              ) : isOwnOrgJob ? (
                <div className="bg-surface rounded-2xl border border-border-strong p-6 text-center">
                  <div className="flex items-center justify-center h-11 w-11 rounded-full bg-surface-muted mx-auto mb-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">
                    Your organization&apos;s posting
                  </p>
                  <p className="text-sm text-muted">
                    This job was posted by{" "}
                    <span className="font-medium text-foreground-secondary">
                      {job.organization?.name ?? "your organization"}
                    </span>
                    . Members of an organization cannot apply to their own job postings.
                  </p>
                  <Link
                    href={paths.jobs}
                    className="inline-block mt-4 text-xs text-muted-foreground hover:text-foreground-secondary underline underline-offset-2 transition-colors"
                  >
                    Manage this posting →
                  </Link>
                </div>
              ) : alreadyApplied ? (
                <div className="bg-surface rounded-2xl border border-green-200 p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">
                    Application submitted!
                  </p>
                  <p className="text-sm text-muted">
                    The hiring team will review your application and be in touch.
                  </p>
                </div>
              ) : !userId ? (
                <div className="bg-surface rounded-2xl border border-border-strong p-6 text-center">
                  <p className="font-semibold text-foreground mb-2">Apply now</p>
                  <p className="text-sm text-muted mb-4">
                    Sign in to apply with your profile in one click.
                  </p>
                  <Link
                    href="/sign-in"
                    className="inline-block w-full rounded-xl bg-[#2d9b6f] text-white text-sm font-medium py-2.5 text-center hover:bg-[#257d5a] transition-colors"
                  >
                    Sign in to apply
                  </Link>
                </div>
              ) : !hasProfile ? (
                <div className="bg-surface rounded-2xl border border-border-strong p-6 text-center">
                  <p className="font-semibold text-foreground mb-2">Apply now</p>
                  <p className="text-sm text-muted mb-4">
                    Complete your profile first so employers can review your
                    background.
                  </p>
                  <Link
                    href="/profile"
                    className="inline-block w-full rounded-xl bg-[#2d9b6f] text-white text-sm font-medium py-2.5 text-center hover:bg-[#257d5a] transition-colors"
                  >
                    Complete your profile
                  </Link>
                </div>
              ) : (
                <div className="bg-surface rounded-2xl border border-border-strong p-6 space-y-5">
                  <div>
                    <h2 className="font-semibold text-foreground text-base">
                      Apply now
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submit your application directly — it only takes a minute.
                    </p>
                  </div>

                  {/* Profile preview */}
                  <div className="rounded-xl border border-border-strong overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setProfileExpanded((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-canvas hover:bg-surface-muted transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground text-left">
                          Your profile will be shared
                        </p>
                        <p className="text-xs text-muted-foreground text-left">
                          Employers will see the following
                        </p>
                      </div>
                      {profileExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {profileExpanded && (
                      <div className="px-4 py-4">
                        <div className="flex items-start gap-3 mb-3">
                          <ProfileInitial name={profileSummary.name} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {profileSummary.name}
                            </p>
                            {profileSummary.headline && (
                              <p className="text-xs text-muted mt-0.5">
                                {profileSummary.headline}
                              </p>
                            )}
                            {profileSummary.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {profileSummary.location}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Skills */}
                        {profileSummary.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {profileSummary.skills.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted"
                              >
                                {s}
                              </span>
                            ))}
                            {profileSummary.skills.length > 4 && (
                              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted">
                                +{profileSummary.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Counts */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          {profileSummary.experienceCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {profileSummary.experienceCount}{" "}
                              {profileSummary.experienceCount === 1
                                ? "role"
                                : "roles"}
                            </span>
                          )}
                          {profileSummary.educationCount > 0 && (
                            <span>
                              {profileSummary.educationCount}{" "}
                              {profileSummary.educationCount === 1
                                ? "entry"
                                : "entries"}
                            </span>
                          )}
                        </div>

                        <Link
                          href="/profile"
                          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit profile
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Cover letter */}
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                      Cover letter
                    </label>
                    <textarea
                      rows={4}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell them why you are a great fit for this role…"
                      className="w-full rounded-xl border border-border-strong px-3.5 py-3 text-sm text-foreground-secondary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]/40 focus:border-[#2d9b6f] resize-none transition"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional, but a short note can make a difference.
                    </p>
                  </div>

                  {job.screeningQuestions &&
                    job.screeningQuestions.length > 0 && (
                      <div className="rounded-xl border border-border-strong bg-canvas/70 p-4 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Screening questions
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            The employer asks a few specifics before reviewing
                            your application.
                          </p>
                        </div>
                        {job.screeningQuestions.map((q) => (
                          <div key={q.id}>
                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                              {q.prompt}
                              {q.required && (
                                <span className="text-red-500"> *</span>
                              )}
                            </label>
                            <textarea
                              rows={q.required ? 3 : 2}
                              required={q.required}
                              value={answers[q.id] ?? ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: e.target.value,
                                }))
                              }
                              placeholder="Your answer…"
                              className="w-full rounded-xl border border-border-strong px-3.5 py-3 text-sm text-foreground-secondary placeholder:text-muted-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]/40 focus:border-[#2d9b6f] resize-none transition"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  <div className="rounded-xl border border-border-strong bg-canvas/80 p-3 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappOptIn}
                        onChange={(e) => setWhatsappOptIn(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border-strong text-[#2d9b6f]"
                      />
                      <span className="text-xs text-muted">
                        Send me WhatsApp updates for shortlisted roles and
                        interviews
                      </span>
                    </label>
                    {whatsappOptIn && (
                      <input
                        type="tel"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        placeholder="0712345678"
                        className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
                        required
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={submitting || (whatsappOptIn && !whatsappPhone.trim())}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2d9b6f] text-white text-sm font-medium py-3 hover:bg-[#257d5a] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting…" : "Submit application"}
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
