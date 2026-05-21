"use client";

type PaginationStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted";
import { AdminLoadMoreButton } from "@/components/admin/AdminActionButton";

type Props = {
  resultsCount: number;
  status: PaginationStatus;
  onLoadMore: (count: number) => void;
  pageSize?: number;
  loadMoreLabel?: string;
  emptyMessage?: string;
};

export function AdminTableFooter({
  resultsCount,
  status,
  onLoadMore,
  pageSize = 15,
  loadMoreLabel = "Load more",
  emptyMessage = "No rows match the current filters.",
}: Props) {
  if (status === "LoadingFirstPage") {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (resultsCount === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">
        Showing {resultsCount} row{resultsCount === 1 ? "" : "s"}
        {status === "LoadingMore" ? " · loading more…" : null}
      </p>
      {status === "CanLoadMore" ?
        <AdminLoadMoreButton onClick={() => onLoadMore(pageSize)}>
          {loadMoreLabel}
        </AdminLoadMoreButton>
      : status === "Exhausted" && resultsCount >= pageSize ?
        <p className="text-xs text-muted">End of list</p>
      : null}
    </div>
  );
}
