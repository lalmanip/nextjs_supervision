/**
 * Element of `response[]` from GET vivapi-user/b2c-enquiry/getAll.
 */
export const B2C_ENQUIRY_STATUS_VALUES = [
  "pending",
  "in_progress",
  "closed",
] as const;

export type B2cEnquiryStatus = (typeof B2C_ENQUIRY_STATUS_VALUES)[number];

export const B2C_ENQUIRY_STATUS_OPTIONS: {
  value: B2cEnquiryStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
];

export function normalizeB2cEnquiryStatus(
  raw: string | null | undefined
): B2cEnquiryStatus | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  if (s === "pending") return "pending";
  if (s === "in_progress" || s === "inprogress") return "in_progress";
  if (s === "closed") return "closed";
  if (B2C_ENQUIRY_STATUS_VALUES.includes(s as B2cEnquiryStatus)) {
    return s as B2cEnquiryStatus;
  }
  return null;
}

export function formatB2cEnquiryStatusLabel(
  status: string | null | undefined
): string {
  if (!status?.trim()) return "—";
  const normalized = normalizeB2cEnquiryStatus(status);
  const opt = B2C_ENQUIRY_STATUS_OPTIONS.find((o) => o.value === normalized);
  if (opt) return opt.label;
  return status.replace(/_/g, " ");
}

export type B2cEnquiryRow = {
  id: number;
  name: string;
  email: string;
  phone: number | string;
  place: string;
  purpose: string;
  enqDate: string;
  message: string;
  adminNotes?: string | null;
  status?: string | null;
};

/** Purpose value routed to Holidays Enquiry (case-insensitive match). */
export const HOLIDAYS_ENQUIRY_PURPOSE = "holidays packages";

export type EnquiryListSegment = "b2c" | "holidays";

export function getEnquiryPurpose(row: Record<string, unknown>): string {
  const v = row.purpose ?? row.Purpose;
  return v == null ? "" : String(v).trim();
}

export function isHolidaysPackageEnquiry(row: Record<string, unknown>): boolean {
  return getEnquiryPurpose(row).toLowerCase() === HOLIDAYS_ENQUIRY_PURPOSE;
}

export function filterEnquiriesBySegment(
  rows: B2cEnquiryRow[],
  segment: EnquiryListSegment
): B2cEnquiryRow[] {
  return rows.filter((r) => {
    const isHoliday = isHolidaysPackageEnquiry(r as Record<string, unknown>);
    return segment === "holidays" ? isHoliday : !isHoliday;
  });
}

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

export type B2cEnquiryColumnSpec = {
  label: string;
  keys: string[];
};

/** Preferred column order for the B2C enquiries table. */
export const B2C_ENQUIRY_TABLE_COLUMNS: B2cEnquiryColumnSpec[] = [
  { keys: K("id"), label: "ID" },
  { keys: K("name"), label: "Name" },
  { keys: K("email"), label: "Email" },
  { keys: K("phone"), label: "Phone" },
  { keys: K("place"), label: "Place" },
  { keys: K("purpose"), label: "Purpose" },
  { keys: [...K("enqDate"), "EnqDate", "enq_date", "Enq_date"], label: "Enquiry date" },
  { keys: K("message"), label: "Message" },
  {
    keys: [...K("status"), "Status"],
    label: "Status",
  },
  {
    keys: [...K("adminNotes"), "admin_notes", "Admin_Notes", "AdminNotes"],
    label: "Admin notes",
  },
];
