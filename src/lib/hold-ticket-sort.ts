import type { SortingFn } from "@tanstack/react-table";
import type { HoldTicketRow } from "@/types/hold-ticket";

/** Missing / invalid dates sort after real dates in ascending order. */
function lastTicketSortKey(v: unknown): number {
  if (v === null || v === undefined) return Number.POSITIVE_INFINITY;
  const s = String(v).trim();
  if (!s) return Number.POSITIVE_INFINITY;
  const t = Date.parse(s);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** Use on the hold-tickets “Last Ticket Date” column (whatever accessor key the API used). */
export const holdTicketLastTicketDateSortingFn: SortingFn<HoldTicketRow> = (
  rowA,
  rowB,
  columnId
) => {
  const a = lastTicketSortKey(rowA.getValue(columnId));
  const b = lastTicketSortKey(rowB.getValue(columnId));
  if (a === b) return 0;
  return a < b ? -1 : 1;
};
