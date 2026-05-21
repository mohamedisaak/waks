"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminOverviewPage() {
  const [viewerClockMs] = useState(() => Date.now());
  const kpis = useQuery(api.admin.overview.kpis, { viewerClockMs });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted mt-1">
          Bounded counts (~2.5k rows scanned per KPI source) respect Convex limits; totals may cap on
          very large installs.{" "}
          <Link
            href="/admin/financials"
            className="text-emerald-700 underline hover:no-underline dark:text-emerald-300"
          >
            View employer financials →
          </Link>
        </p>
      </div>

      {kpis === undefined ?
        <p className="text-sm text-muted">Loading KPIs…</p>
      : <dl className="grid gap-4 sm:grid-cols-3">
          <Metric
            title="Organizations"
            value={String(kpis.organizations.total)}
            capped={kpis.organizations.capped}
          />
          <Metric
            title="Job postings"
            value={String(kpis.jobs.total)}
            capped={kpis.jobs.capped}
          />
          <Metric
            title="Users"
            value={String(kpis.users.total)}
            capped={kpis.users.capped}
          />
          <Metric
            title="Applications (all)"
            value={String(kpis.applications.total)}
            capped={kpis.applications.capped}
          />
          <Metric
            title="Applications (last 7d)"
            value={String(kpis.applicationsLast7d)}
            capped={kpis.applicationsLast7dCapped}
          />
          <Metric
            title="Active jobs (indexed pages)"
            value={String(kpis.activeJobsApprox)}
            capped={kpis.activeJobsCapped}
          />
        </dl>
      }

      {!kpis ? null :
        kpis.organizations.capped ||
        kpis.jobs.capped ||
        kpis.users.capped ||
        kpis.applications.capped ||
        kpis.applicationsLast7dCapped ||
        kpis.activeJobsCapped ?
          <p className="rounded-lg border border-amber-100 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            One or more totals hit the scan cap — open Convex dashboard metrics for
            exact counts when you operate at massive scale.
          </p>
        : null}
    </div>
  );
}

function Metric({
  title,
  value,
  capped,
}: {
  title: string;
  value: string;
  capped: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-strong bg-surface p-4 shadow-sm">
      <dt className="text-xs uppercase tracking-wide text-muted">{title}</dt>
      <dd className="mt-2 text-2xl font-semibold text-foreground">{value}</dd>
      {capped ?
        <p className="mt-2 text-[10px] text-amber-700">Estimated (capped)</p>
      : null}
    </div>
  );
}
