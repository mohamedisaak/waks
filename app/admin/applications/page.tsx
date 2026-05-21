"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminSortableTh } from "@/components/admin/AdminSortableTh";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import { useAdminTableSort } from "@/hooks/useAdminTableSort";

const PAGE_SIZE = 20;

type ApplicationSortColumn =
  | "created"
  | "orgName"
  | "applicantName"
  | "jobTitle"
  | "status";

export default function AdminApplicationsPage() {
  const { sortBy, sortOrder, toggleSort } = useAdminTableSort<ApplicationSortColumn>(
    "created",
    "desc"
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.applications.list,
    { sortBy, sortOrder },
    { initialNumItems: PAGE_SIZE }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Applications</h1>
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-canvas text-xs uppercase text-muted">
            <tr>
              <AdminSortableTh
                label="Applicant"
                column="applicantName"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
              <AdminSortableTh
                label="Job"
                column="jobTitle"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
              <AdminSortableTh
                label="Org"
                column="orgName"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
              <AdminSortableTh
                label="Status"
                column="status"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                className="px-4 py-2"
              />
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row._id} className="border-b border-border">
                <td className="px-4 py-2">
                  <p className="font-medium">{row.applicantName}</p>
                  <p className="text-xs text-muted">{row.applicantEmail}</p>
                </td>
                <td className="px-4 py-2 text-xs">{row.jobTitle ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{row.orgName ?? "—"}</td>
                <td className="px-4 py-2 text-xs capitalize">
                  {row.withdrawn ? "withdrawn" : row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminTableFooter
        resultsCount={results.length}
        status={status}
        onLoadMore={loadMore}
        pageSize={PAGE_SIZE}
        emptyMessage="No applications yet."
      />
    </div>
  );
}
