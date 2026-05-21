"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import {
  financialProductLabel,
  financialRangeForPreset,
  formatUsdCents,
  type FinancialPeriodPreset,
} from "@/lib/adminFinancials";
import {
  formatKesFromMinorUnits,
  formatUsdFromMinorUnits,
} from "@/lib/billingCatalog";

const TX_PAGE_SIZE = 20;
const PRO_ORG_PAGE_SIZE = 10;

type StatusFilter = "all" | "success" | "pending" | "failed";
type ProviderFilter = "all" | "mpesa" | "stripe";

export default function AdminFinancialsPage() {
  const [viewerClockMs] = useState(() => Date.now());
  const [period, setPeriod] = useState<FinancialPeriodPreset>("utc_month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [showProOrgs, setShowProOrgs] = useState(false);

  const range = useMemo(
    () => financialRangeForPreset(period, viewerClockMs),
    [period, viewerClockMs]
  );

  const summary = useQuery(api.admin.financials.summary, {
    viewerClockMs,
    rangeStartMs: range.rangeStartMs,
    rangeEndMs: range.rangeEndMs,
  });

  const txArgs = useMemo(
    () => ({
      viewerClockMs,
      rangeStartMs: range.rangeStartMs,
      rangeEndMs: range.rangeEndMs,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(providerFilter !== "all" ? { provider: providerFilter } : {}),
    }),
    [
      viewerClockMs,
      range.rangeStartMs,
      range.rangeEndMs,
      statusFilter,
      providerFilter,
    ]
  );

  const { results: transactions, status: txStatus, loadMore } =
    usePaginatedQuery(api.admin.financials.transactions, txArgs, {
      initialNumItems: TX_PAGE_SIZE,
    });

  const proOrgs = usePaginatedQuery(
    api.admin.financials.activeProOrgs,
    showProOrgs ? { viewerClockMs } : "skip",
    { initialNumItems: PRO_ORG_PAGE_SIZE }
  );

  const mrrKesPerOrg =
    summary && summary.estimatedMrr.mpesaProCount > 0
      ? summary.estimatedMrr.kesMinor / summary.estimatedMrr.mpesaProCount
      : 0;
  const mrrUsdPerOrg =
    summary && summary.estimatedMrr.clerkStripeProCount > 0
      ? summary.estimatedMrr.usdCents / summary.estimatedMrr.clerkStripeProCount
      : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Financials</h1>
        <p className="text-sm text-muted">
          Employer revenue from M-Pesa and Stripe listing checkouts, plus estimated
          Hiring Pro MRR from active organizations. AdSense and sponsor income are
          not included in phase 1.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted">
          Period
          <select
            className="ml-2 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as FinancialPeriodPreset)
            }
          >
            <option value="utc_month">Current UTC month</option>
            <option value="last_30d">Last 30 days</option>
          </select>
        </label>
        <span className="font-mono text-xs text-muted">{range.label}</span>
      </div>

      {summary === undefined ?
        <p className="text-sm text-muted">Loading summary…</p>
      : <>
          {(summary.paymentsScanCapped || summary.estimatedMrr.orgScanCapped) && (
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100">
              One or more scans hit the row cap (~2.5k). Totals and MRR may be
              understated on very large installs — use the Convex dashboard for
              exact figures.
            </p>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Collected ({range.label})</h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                title="KES collected"
                value={formatKesFromMinorUnits(summary.collectedKesMinor)}
                hint="Successful M-Pesa payments only"
              />
              <Metric
                title="USD collected"
                value={formatUsdFromMinorUnits(summary.collectedUsdCents)}
                hint="Successful Stripe listing checkouts"
              />
              <Metric
                title="M-Pesa attempts"
                value={`${summary.attemptCounts.mpesa.success} ok · ${summary.attemptCounts.mpesa.failed} failed · ${summary.attemptCounts.mpesa.pending} pending`}
              />
              <Metric
                title="Stripe attempts"
                value={`${summary.attemptCounts.stripe.success} ok · ${summary.attemptCounts.stripe.failed} failed · ${summary.attemptCounts.stripe.pending} pending`}
              />
            </dl>
            <p className="text-xs text-muted">
              Card Hiring Pro renewals are billed through Clerk and do not appear
              here until a future payment sync.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Estimated Hiring Pro MRR</h2>
            <p className="text-xs text-muted">
              Active Pro orgs × list price (
              {summary.estimatedMrr.mpesaProCount > 0
                ? formatKesFromMinorUnits(mrrKesPerOrg)
                : "—"}{" "}
              M-Pesa,{" "}
              {summary.estimatedMrr.clerkStripeProCount > 0
                ? formatUsdFromMinorUnits(mrrUsdPerOrg)
                : "—"}{" "}
              card). Not cash collected.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                title="Active Pro orgs"
                value={String(summary.estimatedMrr.proOrgCount)}
              />
              <Metric
                title="Est. MRR (KES)"
                value={formatKesFromMinorUnits(summary.estimatedMrr.kesMinor)}
                hint={`${summary.estimatedMrr.mpesaProCount} M-Pesa`}
              />
              <Metric
                title="Est. MRR (USD)"
                value={formatUsdFromMinorUnits(summary.estimatedMrr.usdCents)}
                hint={`${summary.estimatedMrr.clerkStripeProCount} Clerk/Stripe`}
              />
              <Metric
                title="Needs review"
                value={`${summary.estimatedMrr.proNoBillingProviderCount} no billing provider · ${summary.estimatedMrr.proNoExpiryCount} no expiry`}
              />
            </dl>
            <button
              type="button"
              className="text-sm text-emerald-700 underline hover:no-underline dark:text-emerald-300"
              onClick={() => setShowProOrgs((v) => !v)}
            >
              {showProOrgs ? "Hide" : "Show"} active Pro organizations
            </button>
            {showProOrgs ?
              <>
              <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-canvas text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2">Organization</th>
                      <th className="px-4 py-2">Billing</th>
                      <th className="px-4 py-2">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proOrgs.results.map((org) => (
                      <tr key={org._id} className="border-b border-border">
                        <td className="px-4 py-2">
                          <p className="font-medium">{org.name}</p>
                          <p className="font-mono text-xs text-muted">
                            {org.clerkOrgId}
                          </p>
                        </td>
                        <td className="px-4 py-2">
                          {org.billingProvider ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted">
                          {org.subscriptionExpiresAt
                            ? new Date(org.subscriptionExpiresAt)
                                .toISOString()
                                .slice(0, 10)
                            : "No expiry on file"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminTableFooter
                resultsCount={proOrgs.results.length}
                status={proOrgs.status}
                onLoadMore={proOrgs.loadMore}
                pageSize={PRO_ORG_PAGE_SIZE}
                emptyMessage="No active Pro organizations in scan."
              />
              </>
            : null}
          </section>

          {summary.byProduct.length > 0 ?
            <section className="space-y-3">
              <h2 className="text-lg font-medium">By product (successful)</h2>
              <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-canvas text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2 text-right">Count</th>
                      <th className="px-4 py-2 text-right">KES</th>
                      <th className="px-4 py-2 text-right">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byProduct.map((row) => (
                      <tr key={row.product} className="border-b border-border">
                        <td className="px-4 py-2">
                          {financialProductLabel(row.product)}
                          <span className="ml-2 font-mono text-xs text-muted">
                            {row.product}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.successCount}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.collectedKesMinor > 0
                            ? formatKesFromMinorUnits(row.collectedKesMinor)
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.collectedUsdCents > 0
                            ? formatUsdCents(row.collectedUsdCents)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-medium">Transactions</h2>
              <div className="flex flex-wrap gap-3">
                <label className="text-sm text-muted">
                  Status
                  <select
                    className="ml-2 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as StatusFilter)
                    }
                  >
                    <option value="all">All</option>
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label className="text-sm text-muted">
                  Provider
                  <select
                    className="ml-2 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
                    value={providerFilter}
                    onChange={(e) =>
                      setProviderFilter(e.target.value as ProviderFilter)
                    }
                  >
                    <option value="all">All</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-canvas text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-2">When</th>
                    <th className="px-4 py-2">Provider</th>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Org</th>
                    <th className="px-4 py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">
                        {new Date(tx.createdAt)
                          .toISOString()
                          .replace("T", " ")
                          .slice(0, 19)}{" "}
                        UTC
                      </td>
                      <td className="px-4 py-2 capitalize">{tx.provider}</td>
                      <td className="px-4 py-2">
                        {financialProductLabel(tx.product)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {tx.amountKesMinor !== undefined
                          ? formatKesFromMinorUnits(tx.amountKesMinor)
                          : tx.amountUsdCents !== undefined
                            ? formatUsdCents(tx.amountUsdCents)
                            : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/organizations?q=${encodeURIComponent(tx.clerkOrgId)}`}
                          className="font-mono text-xs text-emerald-700 hover:underline dark:text-emerald-300"
                          title="Find in organizations"
                        >
                          {tx.clerkOrgId.slice(0, 12)}…
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-2 font-mono text-xs text-muted">
                        {tx.externalId ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminTableFooter
              resultsCount={transactions.length}
              status={txStatus}
              onLoadMore={loadMore}
              pageSize={TX_PAGE_SIZE}
              emptyMessage="No payments in this period for the selected filters."
            />
          </section>
        </>
      }
    </div>
  );
}

function Metric({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border-strong bg-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{title}</dt>
      <dd className="mt-1 text-xl font-semibold text-foreground">{value}</dd>
      {hint ?
        <p className="mt-1 text-xs text-muted">{hint}</p>
      : null}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "success" | "failed";
}) {
  const styles =
    status === "success"
      ? "bg-success-bg border-success-border text-success-text"
      : status === "failed"
        ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
        : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${styles}`}
    >
      {status}
    </span>
  );
}
