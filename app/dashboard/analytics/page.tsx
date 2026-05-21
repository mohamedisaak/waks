"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import { canUseHiringAnalytics } from "@/lib/orgPlan";

export default function DashboardAnalyticsPage() {
  const { orgId } = useAuth();
  const now = useTickerNow();
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const tier = useOrgAccessTier(convexOrg ?? undefined, now) ?? "free";

  const allowed =
    convexOrg !== undefined &&
    convexOrg !== null &&
    canUseHiringAnalytics(tier);

  const analytics = useQuery(
    api.analytics.listJobsWithMetrics,
    orgId && allowed ? { clerkOrgId: orgId } : "skip"
  );

  if (
    convexOrg === undefined ||
    (allowed && analytics === undefined)
  ) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground py-16 text-center">
        Loading analytics...
      </div>
    );
  }

  if (
    convexOrg === null ||
    !allowed
  ) {
    return (
      <div className="max-w-xl mx-auto rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 p-8 text-center">
        <p className="font-semibold text-foreground mb-2">
          Analytics are on Starter and Pro
        </p>
        <p className="text-sm text-muted mb-4">
          See views, applicant volume, and stage distribution for every posting.
        </p>
        <Link
          href="/employers/pricing"
          className="inline-block text-sm font-semibold text-amber-800 underline"
        >
          View plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hiring Analytics</h1>
        <p className="text-sm text-muted mt-1">
          Funnel snapshots per posting — refreshed as candidates apply.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-canvas text-left text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Posting</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Applicants</th>
              <th className="px-4 py-3">Conversion</th>
              <th className="px-4 py-3 hidden md:table-cell">Stages</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(analytics ?? []).map((row) => (
              <tr key={row.jobId} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {row.title}
                  {row.featured ? (
                    <span className="ml-2 text-amber-500 text-xs">★</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">{row.views}</td>
                <td className="px-4 py-3 text-muted">{row.applicants}</td>
                <td className="px-4 py-3 text-muted">
                  {row.conversionPct !== null
                    ? `${row.conversionPct}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted hidden md:table-cell">
                  {Object.entries(row.stageTotals)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-xs capitalize">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(analytics?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No job postings yet.
          </p>
        )}
      </div>
    </div>
  );
}
