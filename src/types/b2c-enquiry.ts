/**
 * Element of `response[]` from GET vivapi-user/b2c-enquiry/getAll.
 */
export type B2cEnquiryRow = {
  id: number;
  name: string;
  email: string;
  phone: number | string;
  place: string;
  purpose: string;
  enqDate: string;
  message: string;
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
];
