"use client";

import type { AdminSortDirection } from "@/hooks/useAdminTableSort";

type Props<T extends string> = {
  label: string;
  column: T;
  sortBy: T;
  sortOrder: AdminSortDirection;
  onSort: (column: T) => void;
  className?: string;
};

export function AdminSortableTh<T extends string>({
  label,
  column,
  sortBy,
  sortOrder,
  onSort,
  className = "px-4 py-3",
}: Props<T>) {
  const active = sortBy === column;
  const indicator = active ? (sortOrder === "asc" ? "↑" : "↓") : "↕";

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1.5 font-inherit uppercase tracking-wide text-muted transition-colors hover:text-foreground"
        aria-sort={
          active ?
            sortOrder === "asc" ?
              "ascending"
            : "descending"
          : "none"
        }
      >
        <span>{label}</span>
        <span
          className={`text-[10px] not-italic ${active ? "text-foreground" : "opacity-40"}`}
          aria-hidden
        >
          {indicator}
        </span>
      </button>
    </th>
  );
}
