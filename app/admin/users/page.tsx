"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  AdminActionButton,
  AdminActionGroup,
} from "@/components/admin/AdminActionButton";
import { AdminSortableTh } from "@/components/admin/AdminSortableTh";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import { useAdminTableSort } from "@/hooks/useAdminTableSort";

const PAGE_SIZE = 15;

type JobseekerSortColumn = "created" | "name" | "email";

export default function AdminJobseekersPage() {
  const { sortBy, sortOrder, toggleSort } = useAdminTableSort<JobseekerSortColumn>(
    "created",
    "desc"
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.usersJobseekers.list,
    { sortBy, sortOrder },
    { initialNumItems: PAGE_SIZE }
  );
  const suspend = useMutation(api.admin.actions.suspendJobSeeker);
  const unsuspend = useMutation(api.admin.actions.unsuspendJobSeeker);
  const [busy, setBusy] = useState<Id<"users"> | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Jobseekers</h1>
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
                label="Email"
                column="email"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
              <th className="px-4 py-2">Profile</th>
              <th className="min-w-[180px] px-4 py-3">Moderation</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const suspended = row.platformSuspendedAt !== undefined;
              return (
                <tr key={row._id} className="border-b border-border">
                  <td className="px-4 py-2 font-medium">{row.name}</td>
                  <td className="px-4 py-2 text-xs">{row.email}</td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {[row.profileSummary?.headline, row.profileSummary?.location]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AdminActionGroup>
                    {!suspended ?
                      <AdminActionButton
                        variant="danger"
                        disabled={busy === row._id}
                        onClick={async () => {
                          const note = window.prompt("Suspension note?") ?? "";
                          setBusy(row._id);
                          try {
                            await suspend({
                              userId: row._id,
                              reason: note.trim() || undefined,
                            });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Suspend candidate
                      </AdminActionButton>
                    : <AdminActionButton
                        variant="success"
                        disabled={busy === row._id}
                        onClick={async () => {
                          setBusy(row._id);
                          try {
                            await unsuspend({ userId: row._id });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Lift suspension
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
        emptyMessage="No jobseekers yet."
      />
    </div>
  );
}
