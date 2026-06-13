/**
 * Hold-ticket list rows come straight from vivapi-user without camelCase mapping.
 * Support common key variants for release / display helpers.
 */
export type HoldTicketLoose = Record<string, unknown>;

function firstDefined<T>(...vals: (T | null | undefined)[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

/** Stable row id for radio selection (API may use `id` or string ids). */
export function getHoldTicketRowId(row: HoldTicketLoose): string {
  const v = firstDefined(row.id, row.Id, row.ID);
  if (v === undefined || v === null) return "";
  return String(v);
}

const HOLD_TICKET_ADMIN_NOTES_KEYS = [
  "admin_notes",
  "adminNotes",
  "Admin_Notes",
  "AdminNotes",
] as const;

export function isHoldTicketAdminNotesColumn(key: string): boolean {
  const lower = key.toLowerCase();
  return HOLD_TICKET_ADMIN_NOTES_KEYS.some((k) => k.toLowerCase() === lower);
}

export function getHoldTicketAdminNotes(row: HoldTicketLoose): string | null {
  for (const key of HOLD_TICKET_ADMIN_NOTES_KEYS) {
    const v = row[key];
    if (typeof v === "string") return v;
    if (v === null) return null;
  }
  return null;
}

export function getHoldTicketReleaseFields(row: HoldTicketLoose): {
  bookingId: string;
  source: string;
  pnr: string;
} {
  const bookingRaw = firstDefined(
    row.bookingId,
    row.booking_id,
    row.BookingId,
    row.Booking_id
  );
  const sourceRaw = firstDefined(row.source, row.Source);
  const pnrRaw = firstDefined(row.pnr, row.PNR, row.Pnr);
  return {
    bookingId: bookingRaw != null ? String(bookingRaw) : "",
    source: sourceRaw != null ? String(sourceRaw) : "",
    pnr: pnrRaw != null ? String(pnrRaw) : "",
  };
}
