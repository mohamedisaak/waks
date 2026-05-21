"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import ListingCreditsBanner from "@/components/ListingCreditsBanner";
import { statusSuccess } from "@/lib/themeClasses";
import {
  canUseApplicantTrackingPipeline,
  canUseEmployerNotes,
  canUseFeaturedListings,
  canUseHiringAnalytics,
  canUseOutboundWebhooks,
  canUseRecruitingProductivityPack,
  canUseTalentPool,
} from "@/lib/orgPlan";

export default function DashboardPage() {
  const { orgId, orgSlug } = useAuth();
  const now = useTickerNow();
  const org = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const entitlements = useQuery(
    api.organizations.getListingEntitlements,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  if (org === undefined) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-8">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="h-40 bg-surface-muted rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const tier = useOrgAccessTier(org ?? undefined, now) ?? "free";

  const hasFeaturedListings = canUseFeaturedListings(tier);
  const hasApplicantTracking = canUseApplicantTrackingPipeline(tier);
  const recruitingPack = canUseRecruitingProductivityPack(tier);
  const analytics = canUseHiringAnalytics(tier);
  const notes = canUseEmployerNotes(tier);
  const webhooks = canUseOutboundWebhooks(tier);
  const talentPool = canUseTalentPool(tier);

  const planName =
    tier === "pro"
      ? "Hiring Pro"
      : tier === "starter"
        ? "Legacy Starter"
        : "Free";

  const jobPostingDescription = entitlements
    ? entitlements.legacyUnlimitedListings
      ? "Unlimited active postings (legacy plan)"
      : `${entitlements.slotsRemaining} slot${entitlements.slotsRemaining === 1 ? "" : "s"} left · ${entitlements.listingCredits} unused credit${entitlements.listingCredits === 1 ? "" : "s"}`
    : "1 free active job; buy credits for more";

  const postJobBlocked = entitlements
    ? !entitlements.legacyUnlimitedListings && !entitlements.canActivateMoreJobs
    : false;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          {orgSlug && (
            <p className="text-sm text-muted mt-0.5">@{orgSlug}</p>
          )}
        </div>
        {postJobBlocked ? (
          <Link
            href="/employers/pricing"
            className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Buy listing credits
          </Link>
        ) : (
          <Link
            href="/dashboard/jobs/new"
            className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700"
          >
            + Post a Job
          </Link>
        )}
      </div>

      {entitlements && (
        <ListingCreditsBanner entitlements={entitlements} />
      )}

      {/* Plan feature summary */}
      <div className="rounded-xl border border-border-strong bg-surface p-6">
        <div className="flex flex-wrap gap-4 items-start justify-between mb-4">
          <h2 className="font-semibold text-foreground text-lg">
            Your Plan Features
          </h2>
          <span className="text-sm text-muted">
            Currently on the{" "}
            <span className="font-semibold text-foreground-secondary">{planName}</span>{" "}
            plan
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            label="Job Postings"
            enabled
            description={jobPostingDescription}
            upgradeHref="/employers/pricing"
          />
          <FeatureCard
            label="Featured Listings"
            enabled={hasFeaturedListings}
            description={
              hasFeaturedListings
                ? "Boost visibility across discovery"
                : "Hiring Pro or legacy plan"
            }
            upgradeHref="/employers/pricing"
          />
          <FeatureCard
            label="Applicant Tracking"
            enabled={hasApplicantTracking}
            description={
              hasApplicantTracking
                ? "Full pipeline including shortlist & hire"
                : "Pro unlocks shortlisted & hired transitions"
            }
            upgradeHref="/employers/pricing"
          />
          <FeatureCard
            label="Recruiter productivity pack"
            enabled={recruitingPack}
            description="Bulk actions, tagging, CSV export, applicant view tracking — Starter+."
            upgradeHref="/employers/pricing"
          />
          <FeatureCard
            label="Analytics"
            enabled={analytics}
            description="Understand views, applicants by stage — Starter+."
            upgradeHref="/employers/pricing"
          />
          <FeatureCard
            label="Pro-only hiring suite"
            enabled={notes || webhooks || talentPool}
            description="Talent pool CRM, webhook automations & internal teammate notes live on Pro."
            upgradeHref="/employers/pricing"
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/jobs"
          className="rounded-xl border border-border-strong bg-surface p-5 hover:border-slate-400 transition-colors"
        >
          <p className="font-semibold text-foreground">Manage Jobs</p>
          <p className="text-sm text-muted mt-1">
            View, edit, and publish your job postings.
          </p>
        </Link>
        <Link
          href="/dashboard/applications"
          className="rounded-xl border border-border-strong bg-surface p-5 hover:border-slate-400 transition-colors"
        >
          <p className="font-semibold text-foreground">Applications</p>
          <p className="text-sm text-muted mt-1">
            Review submissions, tagging, CSV export, scheduling.
          </p>
        </Link>
        <Link
          href="/dashboard/applications/board"
          className="rounded-xl border border-border-strong bg-surface p-5 hover:border-slate-400 transition-colors"
        >
          <p className="font-semibold text-foreground">Pipeline Board</p>
          <p className="text-sm text-muted mt-1">
            Kanban view with Pro column ordering.
          </p>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-xl border border-border-strong bg-surface p-5 hover:border-slate-400 transition-colors"
        >
          <p className="font-semibold text-foreground">Analytics</p>
          <p className="text-sm text-muted mt-1">
            Track views, applicants & conversion snapshots.
          </p>
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-xl border border-border-strong bg-surface p-5 hover:border-slate-400 transition-colors"
        >
          <p className="font-semibold text-foreground">Settings &amp; Billing</p>
          <p className="text-sm text-muted mt-1">
            Manage subscriptions and Clerk organization billing.
          </p>
        </Link>
        <Link
          href="/employers/pricing"
          className="rounded-xl border border-border-strong bg-surface p-5 hover:border-slate-400 transition-colors"
        >
          <p className="font-semibold text-foreground">Explore Plans</p>
          <p className="text-sm text-muted mt-1">
            Compare Starter &amp; Pro to unlock richer workflows.
          </p>
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({
  label,
  enabled,
  description,
  upgradeHref,
}: {
  label: string;
  enabled: boolean;
  description: string;
  upgradeHref?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        enabled
          ? `${statusSuccess} border`
          : "border-border-strong bg-canvas"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${enabled ? "bg-green-500" : "bg-muted-foreground"}`}
        />
        <span
          className={`text-sm font-medium ${enabled ? "text-success-text" : "text-foreground"}`}
        >
          {label}
        </span>
      </div>
      <p
        className={`text-xs ${enabled ? "text-success-text/80" : "text-muted"}`}
      >
        {description}
      </p>
      {!enabled && upgradeHref && (
        <Link
          href={upgradeHref}
          className="mt-2 inline-block text-xs font-medium text-warning-text hover:opacity-90"
        >
          Upgrade →
        </Link>
      )}
    </div>
  );
}
