"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import { canAdvanceToPremiumPipelineStages } from "@/lib/orgPlan";

type ApplicationDoc = Doc<"applications">;
type PipelineStage =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "hired";

const DEFAULT_ORDER: PipelineStage[] = [
  "pending",
  "reviewed",
  "shortlisted",
  "rejected",
  "hired",
];

export default function HiringBoardPage() {
  const { orgId, has } = useAuth();
  const now = useTickerNow();
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const tier = useOrgAccessTier(convexOrg ?? undefined, now);

  const hasProReorder =
    (tier !== undefined && canAdvanceToPremiumPipelineStages(tier)) ||
    (has?.({ plan: "pro" }) ?? false);

  const jobs = useQuery(
    api.jobs.listByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const [jobId, setJobId] = useState<string | undefined>(undefined);

  const resolvedJobId = jobId ?? jobs?.[0]?._id;
  const job = useQuery(
    api.jobs.getById,
    resolvedJobId
      ? { id: resolvedJobId as Id<"jobPostings"> }
      : "skip"
  );

  const applications = useQuery(
    api.applications.listByJob,
    orgId && resolvedJobId
      ? {
          jobPostingId: resolvedJobId as Id<"jobPostings">,
          clerkOrgId: orgId,
        }
      : "skip"
  );

  const normalizedPipeline: PipelineStage[] =
    job?.pipelineOrder?.length === DEFAULT_ORDER.length
      ? (job.pipelineOrder as PipelineStage[])
      : DEFAULT_ORDER;

  const pipelineOrder = normalizedPipeline;

  const buckets = useMemo(() => {
    const map = new Map<PipelineStage, ApplicationDoc[]>();
    for (const stage of pipelineOrder) {
      map.set(stage as PipelineStage, []);
    }
    for (const app of (applications ?? []) as ApplicationDoc[]) {
      const key = app.status as PipelineStage;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(app);
    }
    return map;
  }, [applications, pipelineOrder]);

  if (!orgId || jobs === undefined || convexOrg === undefined) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground py-16 text-center">
        Loading pipeline…
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="text-center py-16 text-muted">
        <p className="mb-4">Create a posting to use the Kanban board.</p>
        <Link
          href="/dashboard/jobs/new"
          className="text-sm text-foreground underline font-semibold"
        >
          Post a job →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hiring pipeline board
          </h1>
          <p className="text-sm text-muted mt-1">
            Visualize applicant volume by hiring stage —{" "}
            <Link href="/dashboard/applications" className="underline">
              list view
            </Link>
          </p>
        </div>
        <label className="text-sm flex flex-col gap-1 font-medium text-foreground-secondary">
          Job posting
          <select
            value={(resolvedJobId as string | undefined) ?? ""}
            onChange={(e) => setJobId(e.target.value || undefined)}
            className="font-normal border border-border-strong rounded-md px-3 py-2 bg-surface text-slate-800 min-w-[220px]"
          >
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!hasProReorder && (
        <div className="rounded-lg border border-purple-100 bg-purple-50 text-xs text-purple-900 px-4 py-2">
          Customize column order per posting on{" "}
          <span className="font-semibold">Pro</span> — default columns shown.
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineOrder.map((stage) => {
          const bucket = buckets.get(stage as PipelineStage) ?? [];
          return (
            <div
              key={stage}
              className="min-w-[220px] max-w-[270px] flex flex-col rounded-xl border border-border-strong bg-canvas"
            >
              <div className="px-3 py-3 border-b border-border-strong flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {stage}
                </span>
                <span className="text-xs rounded-full bg-surface border border-border-strong px-2 py-0.5 font-medium text-muted">
                  {bucket.length}
                </span>
              </div>
              <div className="p-3 space-y-2 flex-1">
                {bucket.map((application) => (
                  <div
                    key={application._id}
                    className="rounded-lg bg-surface border border-border-strong p-3 text-sm shadow-sm"
                  >
                    <p className="font-semibold text-foreground leading-tight">
                      {application.applicantName}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {application.applicantEmail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
