/**
 * Element of `response[]` from GET vivapi-user/flight-booking/cancelled-tickets.
 */
export type CancelledTicketRow = {
  id: number;
  ticketId: number;
  ticketNumber: string;
  issueDate: string;
  validatingAirline: string;
  remarks: string;
  status: string;
  conjunctionNumber: string;
  ticketType: string;
  serviceFeeDisplayType: string;
  appReference: string;
};

function camelToSnake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function leadingCapsSnake(snake: string): string {
  const parts = snake.split("_");
  if (!parts[0]) return snake;
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const rest = parts.slice(1).join("_").toLowerCase();
  return rest ? `${first}_${rest}` : first;
}

function K(camel: string, ...extras: string[]): string[] {
  const snake = camelToSnake(camel);
  const lead = leadingCapsSnake(snake);
  return [...new Set([camel, snake, lead, ...extras])];
}

export type CancelledTicketColumnSpec = {
  label: string;
  keys: string[];
};

export function getCancelledTicketRowId(row: Record<string, unknown>): string {
  const v = row.id ?? row.Id ?? row.ID;
  return v != null && v !== "" ? String(v) : "";
}

export function resolveRemarksFieldKey(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => present.add(k));
  }
  const spec = CANCELLED_TICKET_TABLE_COLUMNS.find((c) => c.label === "Remarks");
  if (!spec) return null;
  return spec.keys.find((k) => present.has(k)) ?? null;
}

export function getRemarksValue(
  row: Record<string, unknown>,
  remarksKey: string | null
): string {
  if (!remarksKey) return "";
  const v = row[remarksKey];
  return v == null ? "" : String(v);
}

export const CANCELLED_TICKET_TABLE_COLUMNS: CancelledTicketColumnSpec[] = [
  { keys: K("id"), label: "ID" },
  { keys: K("ticketId"), label: "Ticket ID" },
  { keys: K("ticketNumber"), label: "Ticket number" },
  { keys: K("issueDate"), label: "Issue date" },
  { keys: K("validatingAirline"), label: "Validating airline" },
  { keys: K("status"), label: "Status" },
  { keys: K("ticketType"), label: "Ticket type" },
  { keys: K("conjunctionNumber"), label: "Conjunction #" },
  { keys: K("serviceFeeDisplayType"), label: "Service fee display" },
  { keys: K("appReference"), label: "App reference" },
  { keys: K("remarks"), label: "Remarks" },
];
