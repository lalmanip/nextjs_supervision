/**
 * Shape of each element in GET vivapi-user/flight-booking/hold-tickets → `response[]`.
 * Actual payloads may use snake_case keys; the table builder resolves common variants.
 */
export type HoldTicketRow = {
  id: number;
  bookingId: number;
  parentBookingId: number | null;
  traceId: string;
  appReference: string;
  pnr: string;
  tboConfNo: string;
  journeyType: number;
  tripIndicator: number;
  searchCombinationType: number;
  origin: string;
  destination: string;
  airlineCode: string;
  validatingAirlineCode: string;
  fareType: string;
  resultFareType: string;
  source: number;
  /** When present from API, shown after Source in the hold table. */
  lastTicketDate?: string | null;
  isLcc: boolean;
  isDomestic: boolean;
  nonRefundable: boolean;
  status: number;
  invoiceNo: string | null;
  invoiceAmount: number | null;
  invoiceStatus: number | null;
  invoiceCreatedOn: string | null;
  issuancePcc: string | null;
  supplierFareClasses: string;
  fareClassification: string;
  remarks: string | null;
  airlineRemark: string | null;
  isAutoReissuanceAllowed: boolean;
  isPartialVoidAllowed: boolean;
  isSeatsBooked: boolean;
  isCouponApplicable: boolean;
  isManual: boolean;
  isWebCheckinAllowed: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Row keys we never show as table columns (large / internal payloads). */
const HOLD_TICKET_HIDDEN_KEYS_LC = new Set([
  "itinerary_details",
  "passenger_details",
  "result_token",
]);

export function isHoldTicketHiddenColumn(key: string): boolean {
  return HOLD_TICKET_HIDDEN_KEYS_LC.has(key.toLowerCase());
}

function camelToSnake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** `booking_id` → `Booking_id` style seen on some vivapi responses. */
function leadingCapsSnake(snake: string): string {
  const parts = snake.split("_");
  if (!parts[0]) return snake;
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const rest = parts.slice(1).join("_").toLowerCase();
  return rest ? `${first}_${rest}` : first;
}

/** Typical API key spellings for a logical camelCase field. */
function K(camel: string, ...extras: string[]): string[] {
  const snake = camelToSnake(camel);
  const lead = leadingCapsSnake(snake);
  return [...new Set([camel, snake, lead, ...extras])];
}

export type HoldTicketColumnSpec = {
  label: string;
  /** First key that exists on the row is used for this column. */
  keys: string[];
};

/** Preferred column order for the hold tickets table. */
export const HOLD_TICKET_TABLE_COLUMNS: HoldTicketColumnSpec[] = [
  { keys: K("id"), label: "ID" },
  { keys: K("bookingId"), label: "Booking ID" },
  { keys: K("parentBookingId"), label: "Parent booking" },
  { keys: K("appReference"), label: "App ref" },
  { keys: K("pnr"), label: "PNR" },
  { keys: K("tboConfNo"), label: "TBO conf." },
  { keys: K("traceId"), label: "Trace ID" },
  { keys: K("origin"), label: "Origin" },
  { keys: K("destination"), label: "Destination" },
  { keys: K("airlineCode"), label: "Airline" },
  { keys: K("validatingAirlineCode"), label: "Validating" },
  { keys: K("fareType"), label: "Fare type" },
  { keys: K("resultFareType"), label: "Result fare" },
  { keys: K("journeyType"), label: "Journey type" },
  { keys: K("tripIndicator"), label: "Trip" },
  { keys: K("searchCombinationType"), label: "Search combo" },
  { keys: K("source"), label: "Source" },
  {
    keys: [
      ...K("lastTicketDate"),
      "LastTicketDate",
      "Last_Ticket_Date",
      "lastTicketDt",
      "LastTicketDt",
      "last_tkt_date",
      "Last_Tkt_Date",
    ],
    label: "Last Ticket Date",
  },
  { keys: K("status"), label: "Status" },
  { keys: K("isDomestic"), label: "Domestic" },
  { keys: K("isLcc"), label: "LCC" },
  { keys: K("nonRefundable"), label: "Non-ref." },
  { keys: K("isManual"), label: "Manual" },
  { keys: K("isSeatsBooked"), label: "Seats booked" },
  { keys: K("isCouponApplicable"), label: "Coupon" },
  { keys: K("isWebCheckinAllowed"), label: "Web CI" },
  { keys: K("isAutoReissuanceAllowed"), label: "Auto reissue" },
  { keys: K("isPartialVoidAllowed"), label: "Partial void" },
  { keys: K("fareClassification"), label: "Fare class." },
  { keys: K("supplierFareClasses"), label: "Supplier fare cls" },
  { keys: K("remarks"), label: "Remarks" },
  { keys: K("airlineRemark"), label: "Airline remark" },
  { keys: K("invoiceNo"), label: "Invoice #" },
  { keys: K("invoiceAmount"), label: "Invoice amt" },
  { keys: K("invoiceStatus"), label: "Inv. status" },
  { keys: K("invoiceCreatedOn"), label: "Inv. created" },
  { keys: K("issuancePcc"), label: "Issuance PCC" },
  { keys: K("createdAt"), label: "Created" },
  { keys: K("updatedAt"), label: "Updated" },
];
