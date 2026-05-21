"use client";

import { useCallback, useState } from "react";

export type AdminSortDirection = "asc" | "desc";

/** Text columns default to ascending on first click; dates default to descending. */
export function defaultDirectionForColumn(column: string): AdminSortDirection {
  if (
    column === "organizationName" ||
    column === "orgName" ||
    column === "name" ||
    column === "title" ||
    column === "email" ||
    column === "applicantName" ||
    column === "jobTitle" ||
    column === "plan" ||
    column === "status"
  ) {
    return "asc";
  }
  return "desc";
}

export function useAdminTableSort<T extends string>(
  defaultColumn: T,
  defaultDirection: AdminSortDirection = "desc"
) {
  const [sortBy, setSortBy] = useState<T>(defaultColumn);
  const [sortOrder, setSortOrder] = useState<AdminSortDirection>(defaultDirection);

  const toggleSort = useCallback(
    (column: T) => {
      if (sortBy === column) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return;
      }
      setSortBy(column);
      setSortOrder(defaultDirectionForColumn(column));
    },
    [sortBy]
  );

  return { sortBy, sortOrder, toggleSort };
}
