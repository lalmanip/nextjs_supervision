/**
 * Element of `response[]` from GET vivapi-user/flight-booking/failed-booking-recovery
 */
export type FailedBookingRecoveryRow = {
  id: number;
  app_reference: string;
  result_token: string;
  pay_id: string | null;
  pay_order_id: string | null;
  payment_method: string | null;
  payment_status: string | null;
  lead_pax_title: string;
  lead_pax_first_name: string;
  lead_pax_last_name: string;
  lead_pax_email: string;
  lead_pax_contact: string;
  lead_pax_dob: string;
  lead_pax_passport_no: string;
  lead_pax_passport_expiry: string;
  lead_pax_nationality: string;
  /** JSON string — itinerary */
  itinerary_details: string;
  /** JSON string — passengers */
  passenger_details: string;
  error_message: string;
  admin_status: string;
  admin_notes: string | null;
  created_date: string;
  updated_date: string;
};

export const FAILED_BOOKING_RECOVERY_COLUMNS: {
  key: keyof FailedBookingRecoveryRow;
  label: string;
}[] = [
  { key: "id", label: "ID" },
  { key: "app_reference", label: "App reference" },
  { key: "admin_status", label: "Admin status" },
  { key: "error_message", label: "Error" },
  { key: "lead_pax_title", label: "Title" },
  { key: "lead_pax_first_name", label: "First name" },
  { key: "lead_pax_last_name", label: "Last name" },
  { key: "lead_pax_email", label: "Email" },
  { key: "lead_pax_contact", label: "Contact" },
  { key: "lead_pax_dob", label: "DOB" },
  { key: "lead_pax_nationality", label: "Nationality" },
  { key: "payment_method", label: "Pay method" },
  { key: "payment_status", label: "Pay status" },
  { key: "pay_id", label: "Pay ID" },
  { key: "pay_order_id", label: "Pay order" },
  { key: "result_token", label: "Result token" },
  { key: "lead_pax_passport_no", label: "Passport #" },
  { key: "lead_pax_passport_expiry", label: "Passport exp." },
  { key: "itinerary_details", label: "Itinerary (JSON)" },
  { key: "passenger_details", label: "Passengers (JSON)" },
  { key: "admin_notes", label: "Admin notes" },
  { key: "created_date", label: "Created" },
  { key: "updated_date", label: "Updated" },
];
