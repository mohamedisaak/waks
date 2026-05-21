"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  AdminActionButton,
  AdminActionGroup,
} from "@/components/admin/AdminActionButton";
import { AdminSortableTh } from "@/components/admin/AdminSortableTh";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import { useAdminTableSort } from "@/hooks/useAdminTableSort";

const PAGE_SIZE = 15;

type OrgSortColumn = "created" | "name" | "plan";

export default function AdminOrganizationsPage() {
  const { sortBy, sortOrder, toggleSort } = useAdminTableSort<OrgSortColumn>(
    "created",
    "desc"
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.organizations.list,
    { sortBy, sortOrder },
    { initialNumItems: PAGE_SIZE }
  );
  const suspend = useMutation(api.admin.actions.suspendOrganization);
  const unsuspend = useMutation(api.admin.actions.unsuspendOrganization);
  const downgradeToFree = useMutation(
    api.admin.actions.downgradeOrganizationToFree
  );
  const [busy, setBusy] = useState<Doc<"organizations">["_id"] | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-canvas text-xs uppercase text-muted">
            <tr>
              <AdminSortableTh
                label="Name"
                column="name"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
              <AdminSortableTh
                label="Plan"
                column="plan"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
              <th className="px-4 py-2">Billing</th>
              <th className="px-4 py-2">Status</th>
              <th className="min-w-[200px] px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((org) => {
              const suspended = org.platformSuspendedAt !== undefined;
              return (
                <tr key={org._id} className="border-b border-border">
                  <td className="px-4 py-2">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </td>
                  <td className="px-4 py-2">{org.plan}</td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {org.billingProvider ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        suspended ?
                          "rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800"
                        : "rounded-full bg-success-bg border border-success-border px-2 py-0.5 text-xs text-success-text"
                      }
                    >
                      {suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <AdminActionGroup>
                      {(org.plan === "starter" || org.plan === "pro") ?
                        <AdminActionButton
                          variant="secondary"
                          disabled={busy === org._id}
                          title="Sets Convex billing fields to Free (same outcome as pricing-page downgrade contact). Cancel Stripe / M-Pesa separately if needed."
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Downgrade "${org.name}" to Free in Convex?\n\nPaid features stop immediately for this workspace. If they pay via Stripe or M-Pesa, cancel or refund in those systems separately — Clerk cannot be updated from here automatically.`
                              )
                            ) {
                              return;
                            }
                            const note =
                              window.prompt(
                                "Optional note for audit log (reason / ticket):"
                              ) ?? undefined;
                            setBusy(org._id);
                            try {
                              await downgradeToFree({
                                orgId: org._id,
                                note:
                                  note && note.trim() ? note.trim() : undefined,
                              });
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Downgrade to free
                        </AdminActionButton>
                      : null}
                      {!suspended ?
                        <AdminActionButton
                          variant="danger"
                          disabled={busy === org._id}
                          onClick={async () => {
                            const reason =
                              window.prompt(
                                "Optional suspension note for audit log:"
                              ) ?? undefined;
                            setBusy(org._id);
                            try {
                              await suspend({
                                orgId: org._id,
                                reason:
                                  reason && reason.trim() ?
                                    reason.trim()
                                  : undefined,
                              });
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Suspend
                        </AdminActionButton>
                      : <AdminActionButton
                          variant="success"
                          disabled={busy === org._id}
                          onClick={async () => {
                            setBusy(org._id);
                            try {
                              await unsuspend({ orgId: org._id });
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Unsuspend
                        </AdminActionButton>}
                    </AdminActionGroup>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdminTableFooter
        resultsCount={results.length}
        status={status}
        onLoadMore={loadMore}
        pageSize={PAGE_SIZE}
        emptyMessage="No organizations yet."
      />
    </div>
  );
}
