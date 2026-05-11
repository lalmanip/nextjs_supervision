/**
 * Shape of each element in GET vivapi-user/flight-booking/hold-tickets → `response[]`.
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

/** Preferred column order for the hold tickets table (API field → header label). */
export const HOLD_TICKET_TABLE_COLUMNS: { key: keyof HoldTicketRow; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "bookingId", label: "Booking ID" },
  { key: "parentBookingId", label: "Parent booking" },
  { key: "appReference", label: "App ref" },
  { key: "pnr", label: "PNR" },
  { key: "tboConfNo", label: "TBO conf." },
  { key: "traceId", label: "Trace ID" },
  { key: "origin", label: "Origin" },
  { key: "destination", label: "Destination" },
  { key: "airlineCode", label: "Airline" },
  { key: "validatingAirlineCode", label: "Validating" },
  { key: "fareType", label: "Fare type" },
  { key: "resultFareType", label: "Result fare" },
  { key: "journeyType", label: "Journey type" },
  { key: "tripIndicator", label: "Trip" },
  { key: "searchCombinationType", label: "Search combo" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "isDomestic", label: "Domestic" },
  { key: "isLcc", label: "LCC" },
  { key: "nonRefundable", label: "Non-ref." },
  { key: "isManual", label: "Manual" },
  { key: "isSeatsBooked", label: "Seats booked" },
  { key: "isCouponApplicable", label: "Coupon" },
  { key: "isWebCheckinAllowed", label: "Web CI" },
  { key: "isAutoReissuanceAllowed", label: "Auto reissue" },
  { key: "isPartialVoidAllowed", label: "Partial void" },
  { key: "fareClassification", label: "Fare class." },
  { key: "supplierFareClasses", label: "Supplier fare cls" },
  { key: "remarks", label: "Remarks" },
  { key: "airlineRemark", label: "Airline remark" },
  { key: "invoiceNo", label: "Invoice #" },
  { key: "invoiceAmount", label: "Invoice amt" },
  { key: "invoiceStatus", label: "Inv. status" },
  { key: "invoiceCreatedOn", label: "Inv. created" },
  { key: "issuancePcc", label: "Issuance PCC" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
];
