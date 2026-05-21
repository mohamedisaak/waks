import type { PaginationOptions, PaginationResult } from "convex/server";

/** Max rows loaded into memory for admin sorts that lack a matching index. */
export const ADMIN_LIST_SORT_CAP = 2500;

export type AdminSortDirection = "asc" | "desc";

export function paginateSortedArray<T>(
  items: readonly T[],
  paginationOpts: PaginationOptions
): PaginationResult<T> {
  const start = Number.parseInt(paginationOpts.cursor ?? "0", 10) || 0;
  const pageSize = paginationOpts.numItems;
  const page = items.slice(start, start + pageSize);
  const next = start + page.length;
  const isDone = next >= items.length;
  return {
    page,
    isDone,
    continueCursor: String(next),
  };
}

export function compareStrings(
  a: string,
  b: string,
  direction: AdminSortDirection
): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
}

export function compareNumbers(
  a: number,
  b: number,
  direction: AdminSortDirection
): number {
  return direction === "asc" ? a - b : b - a;
}
