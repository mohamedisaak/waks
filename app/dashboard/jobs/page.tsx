"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import ListingCreditsBanner from "@/components/ListingCreditsBanner";
import ListingCreditsPaywallModal from "@/components/ListingCreditsPaywallModal";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";
import {
  statusDangerBadge,
  statusSuccessBadge,
  statusSuccessButton,
} from "@/lib/themeClasses";

const STATUS_STYLES: Record<string, string> = {
  active: statusSuccessBadge,
  draft: "rounded-full px-2 py-0.5 text-xs font-medium bg-surface-muted text-muted border border-border",
  closed: statusDangerBadge,
};

export default function DashboardJobsPage() {
  const { orgId } = useAuth();
  const employerBillingEnabled = useEmployerBillingEnabled();
  const [showListingPaywall, setShowListingPaywall] = useState(false);
  const jobs = useQuery(
    api.jobs.listByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const updateStatus = useMutation(api.jobs.updateStatus);
  const removeJob = useMutation(api.jobs.remove);
  const entitlements = useQuery(
    api.organizations.getListingEntitlements,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const publishBlocked =
    employerBillingEnabled !== false &&
    entitlements !== undefined &&
    !entitlements.legacyUnlimitedListings &&
    !entitlements.canActivateMoreJobs;

  async function handleStatusChange(
    jobId: Id<"jobPostings">,
    newStatus: "active" | "draft" | "closed"
  ) {
    if (!orgId) return;
    if (
      newStatus === "active" &&
      publishBlocked &&
      jobs?.find((j) => j._id === jobId)?.status !== "active"
    ) {
      setShowListingPaywall(true);
      return;
    }
    try {
      await updateStatus({ id: jobId, clerkOrgId: orgId, status: newStatus });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("listing credit") ||
        message.includes("active job limit")
      ) {
        setShowListingPaywall(true);
      } else {
        alert(message || "Failed to update job status.");
      }
    }
  }

  async function handleDelete(jobId: Id<"jobPostings">) {
    if (!orgId) return;
    if (!confirm("Delete this job posting? This cannot be undone.")) return;
    await removeJob({ id: jobId, clerkOrgId: orgId });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Postings</h1>
          <p className="text-sm text-muted mt-0.5">
            {jobs ? `${jobs.length} posting${jobs.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        {publishBlocked ? (
          <button
            type="button"
            onClick={() => setShowListingPaywall(true)}
            className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Buy listing credits
          </button>
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
        <ListingCreditsBanner entitlements={entitlements} variant="compact" />
      )}

      {jobs === undefined && (
        <div className="text-sm text-muted-foreground py-8 text-center animate-pulse">
          Loading jobs...
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-border-strong bg-surface">
          <p className="text-muted mb-4">No job postings yet.</p>
          <Link
            href="/dashboard/jobs/new"
            className="text-sm font-medium text-foreground underline hover:no-underline"
          >
            Create your first job →
          </Link>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-surface rounded-xl border border-border-strong p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h2 className="font-semibold text-foreground truncate">
                    {job.title}
                  </h2>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}
                  >
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  {job.featured && (
                    <span className="flex-shrink-0 rounded-full bg-warning-bg border border-warning-border px-2 py-0.5 text-xs font-medium text-warning-text">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">
                  {job.location} · {job.employmentType} · {job.locationType}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {job.status === "draft" && (
                  <button
                    onClick={() => handleStatusChange(job._id, "active")}
                    disabled={publishBlocked}
                    className={statusSuccessButton}
                  >
                    Publish
                  </button>
                )}
                {job.status === "active" && (
                  <button
                    onClick={() => handleStatusChange(job._id, "closed")}
                    className="text-xs font-medium text-muted bg-canvas border border-border-strong rounded-md px-3 py-1.5 hover:bg-surface-muted"
                  >
                    Close
                  </button>
                )}
                {job.status === "closed" && (
                  <button
                    onClick={() => handleStatusChange(job._id, "active")}
                    disabled={publishBlocked}
                    className={statusSuccessButton}
                  >
                    Reopen
                  </button>
                )}
                <Link
                  href={`/dashboard/jobs/${job._id}/edit`}
                  className="text-xs font-medium text-muted bg-surface border border-border-strong rounded-md px-3 py-1.5 hover:bg-canvas"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(job._id)}
                  className="text-xs font-medium text-red-600 bg-surface border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {employerBillingEnabled !== false && showListingPaywall && orgId && (
        <ListingCreditsPaywallModal
          title="Buy a listing credit"
          description="Publish another concurrent active job after payment confirms."
          product="listing_single"
          clerkOrgId={orgId}
          returnPath="/dashboard/jobs"
          onClose={() => setShowListingPaywall(false)}
          onSuccess={() => setShowListingPaywall(false)}
        />
      )}
    </div>
  );
}
