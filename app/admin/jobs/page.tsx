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

type JobSortColumn = "created" | "organizationName" | "title" | "status";

export default function AdminJobsPage() {
  const { sortBy, sortOrder, toggleSort } = useAdminTableSort<JobSortColumn>(
    "created",
    "desc"
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.jobs.list,
    { sortBy, sortOrder },
    { initialNumItems: PAGE_SIZE }
  );
  const hide = useMutation(api.admin.actions.hideJobFromPublicBoard);
  const show = useMutation(api.admin.actions.showJobOnPublicBoard);
  const toggleFeatured = useMutation(api.admin.actions.setJobFeatured);
  const [busy, setBusy] = useState<Id<"jobPostings"> | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Job postings</h1>
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-canvas text-xs uppercase text-muted">
            <tr>
              <AdminSortableTh
                label="Role"
                column="title"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
              />
              <AdminSortableTh
                label="Org"
                column="organizationName"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
              />
              <AdminSortableTh
                label="Status"
                column="status"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
              />
              <th className="px-4 py-3">Public</th>
              <th className="min-w-[220px] px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const hidden = row.platformHiddenAt !== undefined;
              return (
                <tr key={row._id} className="border-b border-border align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.location}</p>
                    {row.featured ?
                      <span className="mt-1.5 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        Featured
                      </span>
                    : null}
                  </td>
                  <td className="px-4 py-3 text-sm">{row.organizationName ?? "—"}</td>
                  <td className="px-4 py-3 text-sm capitalize">{row.status}</td>
                  <td className="px-4 py-3 text-sm">{hidden ? "Hidden" : "Listed"}</td>
                  <td className="px-4 py-3">
                    <AdminActionGroup>
                      {!hidden ?
                        <AdminActionButton
                          variant="danger"
                          disabled={busy === row._id}
                          onClick={async () => {
                            const r =
                              window.prompt("Hide reason for audit log?") ??
                              undefined;
                            setBusy(row._id);
                            try {
                              await hide({
                                jobPostingId: row._id,
                                reason: r && r.trim() ? r : undefined,
                              });
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Hide from board
                        </AdminActionButton>
                      : <AdminActionButton
                          variant="success"
                          disabled={busy === row._id}
                          onClick={async () => {
                            setBusy(row._id);
                            try {
                              await show({ jobPostingId: row._id });
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Show on board
                        </AdminActionButton>}
                      <AdminActionButton
                        variant="secondary"
                        disabled={busy === row._id}
                        onClick={async () => {
                          setBusy(row._id);
                          try {
                            await toggleFeatured({
                              jobPostingId: row._id,
                              featured: !row.featured,
                            });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Toggle featured
                      </AdminActionButton>
                    </AdminActionGroup>
                    <p className="mt-2 text-xs text-muted-foreground">
                      👁 {row.viewCount ?? 0} · inbox {row.applicationCount ?? 0}
                    </p>
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
        emptyMessage="No job postings yet."
      />
    </div>
  );
}
