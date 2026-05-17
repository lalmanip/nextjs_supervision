import type { SortingFn } from "@tanstack/react-table";

/** Missing / invalid ISO dates sort after real dates in ascending order. */
function dateSortKey(v: unknown): number {
  if (v === null || v === undefined) return Number.POSITIVE_INFINITY;
  const s = String(v).trim();
  if (!s) return Number.POSITIVE_INFINITY;
  const t = Date.parse(s);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function isoDateColumnSortingFn<T>(): SortingFn<T> {
  return (rowA, rowB, columnId) => {
    const a = dateSortKey(rowA.getValue(columnId));
    const b = dateSortKey(rowB.getValue(columnId));
    if (a === b) return 0;
    return a < b ? -1 : 1;
  };
}
