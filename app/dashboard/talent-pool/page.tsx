"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import { canUseTalentPool } from "@/lib/orgPlan";

export default function TalentPoolPage() {
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
    canUseTalentPool(tier);

  const rows = useQuery(
    api.talentPool.listTalentPool,
    orgId && allowed ? { clerkOrgId: orgId } : "skip"
  );
  const removeOne = useMutation(api.talentPool.removeTalentCandidate);

  if (convexOrg === undefined || (allowed && rows === undefined)) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground py-16 text-center">
        Loading talent pool...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto rounded-xl border border-info-border bg-info-bg p-8 text-center">
        <p className="font-semibold text-foreground mb-2">
          Talent CRM is included with Pro
        </p>
        <p className="text-sm text-muted mb-4">
          Save standout applicants directly from Applications and keep them on
          file for upcoming roles — even between postings.
        </p>
        <Link
          href="/employers/pricing"
          className="inline-block text-sm font-semibold text-blue-900 underline"
        >
          Upgrade →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Talent pool</h1>
        <p className="text-sm text-muted mt-1">
          Candidates you flagged from inbound applications stay here for future outreach.
        </p>
      </div>

      <div className="rounded-xl border border-border-strong bg-surface divide-y divide-slate-100">
        {(rows ?? []).map((row) => (
          <div
            key={row._id}
            className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div>
              <p className="font-semibold text-foreground">{row.applicantName}</p>
              <p className="text-sm text-muted">{row.applicantEmail}</p>
              {row.note && (
                <p className="text-xs text-muted mt-2 bg-canvas border border-border rounded-md p-2">
                  {row.note}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                removeOne({ id: row._id, clerkOrgId: orgId! })
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-surface border border-red-200 text-red-700 self-start"
            >
              Remove
            </button>
          </div>
        ))}
        {(rows ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-14 px-6">
            No saved candidates yet. Open Applications and tap “Save to talent pool”.
          </p>
        )}
      </div>
    </div>
  );
}
