import { z } from "zod";

const highlightSchema = z.object({
  highlight: z.string().min(1, "Highlight is required"),
  sortOrder: z.coerce.number().int().min(0),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  meals: z.string().optional().default(""),
  accommodation: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0),
  highlights: z.array(highlightSchema).min(1, "Add at least one highlight"),
});

export type ItineraryDayInput = z.infer<typeof itineraryDaySchema>;

export function createEmptyItineraryDay(dayNumber: number): ItineraryDayInput {
  return {
    dayNumber,
    title: "",
    description: "",
    meals: "",
    accommodation: "",
    sortOrder: dayNumber,
    highlights: [{ highlight: "", sortOrder: 1 }],
  };
}

/** Build one itinerary row per package `days`; preserves existing row data by index. */
export function syncItineraryToPackageDays(
  current: ItineraryDayInput[],
  packageDays: number
): ItineraryDayInput[] {
  const count = Math.max(1, Math.floor(packageDays) || 1);
  return Array.from({ length: count }, (_, i) => {
    const dayNumber = i + 1;
    const existing = current[i];
    if (existing) {
      return {
        ...existing,
        dayNumber,
        sortOrder: dayNumber,
      };
    }
    return createEmptyItineraryDay(dayNumber);
  });
}

const inclusionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  sortOrder: z.coerce.number().int().min(0),
});

/** Fixed inclusion choices for the create-package wizard (checkboxes). */
export const HOLIDAY_PACKAGE_INCLUSION_OPTIONS = [
  { label: "Flights", sortOrder: 1 },
  { label: "Hotel", sortOrder: 2 },
  { label: "Sightseeing", sortOrder: 3 },
  { label: "Meals", sortOrder: 4 },
  { label: "Visa", sortOrder: 5 },
  { label: "Manager", sortOrder: 6 },
] as const;

export function buildInclusionsFromLabels(selectedLabels: string[]): {
  label: string;
  sortOrder: number;
}[] {
  const set = new Set(selectedLabels);
  return HOLIDAY_PACKAGE_INCLUSION_OPTIONS.filter((o) => set.has(o.label)).map(
    (o) => ({ label: o.label, sortOrder: o.sortOrder })
  );
}

export function isInclusionOptionSelected(
  inclusions: { label: string }[],
  label: string
): boolean {
  return inclusions.some((i) => i.label === label);
}

const detailSectionSchema = z.object({
  sectionType: z.enum(
    ["highlights", "inclusions", "exclusions", "flights_note", "visa_note"],
    { message: "Select a valid section type" }
  ),
  content: z.string().min(1, "Content is required"),
  sortOrder: z.coerce.number().int().min(0),
});

const hotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  nights: z.string().min(1, "Nights is required"),
  mealPlan: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0),
});

const termSchema = z.object({
  termText: z.string().min(1, "Term text is required"),
  sortOrder: z.coerce.number().int().min(0),
});

/** Backend `categoryCode` values with display labels for the create-package form. */
export const HOLIDAY_PACKAGE_CATEGORY_OPTIONS = [
  { code: "best-seller", label: "Best Seller Packages" },
  { code: "group", label: "Group Packages" },
  { code: "senior", label: "Senior Citizen Special" },
  { code: "customized", label: "Customized Packages" },
  { code: "honeymoon", label: "Honeymoon Special" },
  { code: "budget", label: "Budget Packages" },
] as const;

export const holidayPackageCategoryCodes = HOLIDAY_PACKAGE_CATEGORY_OPTIONS.map(
  (o) => o.code
);

export type HolidayPackageCategoryCode = (typeof HOLIDAY_PACKAGE_CATEGORY_OPTIONS)[number]["code"];

/** Detail section types stored in `holidays_package_detail_sections.section_type`. */
export const HOLIDAY_PACKAGE_DETAIL_SECTION_TYPE_OPTIONS = [
  { value: "highlights", label: "Highlights" },
  { value: "inclusions", label: "Inclusions" },
  { value: "exclusions", label: "Exclusions" },
  { value: "flights_note", label: "Flights note" },
  { value: "visa_note", label: "Visa note" },
] as const;

export const holidayPackageDetailSectionTypes =
  HOLIDAY_PACKAGE_DETAIL_SECTION_TYPE_OPTIONS.map((o) => o.value);

export type HolidayPackageDetailSectionType =
  (typeof HOLIDAY_PACKAGE_DETAIL_SECTION_TYPE_OPTIONS)[number]["value"];

/** Map legacy/API aliases to canonical section types for the admin form. */
export function normalizeDetailSectionType(
  sectionType: string
): HolidayPackageDetailSectionType {
  const normalized = sectionType.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "flights") return "flights_note";
  if (normalized === "visa") return "visa_note";
  if (
    (holidayPackageDetailSectionTypes as readonly string[]).includes(normalized)
  ) {
    return normalized as HolidayPackageDetailSectionType;
  }
  return "highlights";
}

/** Slugify text for URL segments (lowercase, hyphen-separated). */
function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build destination slug as `{name}-tour-packages` (kebab-case). */
export function destinationSlugFromName(destinationName: string): string {
  const base = slugifySegment(destinationName);
  if (!base) return "";
  const namePart = base.replace(/-tour-packages$/, "");
  return `${namePart}-tour-packages`;
}

/** Build tour package slug from title (kebab-case). */
export function packageSlugFromTitle(title: string): string {
  return slugifySegment(title);
}

/** Suggested package types for the create wizard (custom values allowed). */
export const HOLIDAY_PACKAGE_TYPE_OPTIONS = [
  "Classic",
  "Premium",
  "Fully Loaded",
] as const;

/** First three letters of the destination name (A–Z), padded with X if shorter. */
export function destinationCodeFromName(destinationName: string): string {
  const letters = destinationName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (!letters) return "XXX";
  return letters.slice(0, 3).padEnd(3, "X");
}

function packageTypeToIdSegment(packageType: string): string {
  return packageType.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "TYPE";
}

function categoryCodeToIdSegment(categoryCode: string): string {
  const primary = categoryCode.split("-")[0] ?? categoryCode;
  return primary.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "GEN";
}

/**
 * Build package ID: PKG-{dest3}-{category}-{packageType}-{seq}
 * e.g. Mauritius + best-seller + Classic → PKG-MAU-BEST-CLASSIC-001
 * (Category uses the first segment of the category code, e.g. best-seller → BEST.)
 */
export function buildPackageId(params: {
  destinationName: string;
  categoryCode: string;
  packageType: string;
  sequence?: number;
}): string {
  const dest = destinationCodeFromName(params.destinationName);
  const category = categoryCodeToIdSegment(params.categoryCode);
  const type = packageTypeToIdSegment(params.packageType);
  const seq = String(params.sequence ?? 1).padStart(3, "0");
  return `PKG-${dest}-${category}-${type}-${seq}`;
}

export const destinationSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  name: z.string().min(1, "Destination name is required"),
  region: z.enum(["international", "india"]),
  description: z.string().optional().default(""),
  heroImageUrl: z.string().optional().default(""),
  startingPrice: z.coerce.number().min(0),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

export const tourPackageBasicsSchema = z.object({
  pkgId: z.string().min(1, "Package ID is required"),
  slug: z.string().min(1, "Slug is required"),
  categoryCode: z.enum(
    [
      "best-seller",
      "group",
      "senior",
      "customized",
      "honeymoon",
      "budget",
    ],
    { message: "Select a category" }
  ),
  title: z.string().min(1, "Title is required"),
  imageUrl: z.string().optional().default(""),
  price: z.coerce.number().min(0),
  days: z.coerce.number().int().min(1),
  nights: z.coerce.number().int().min(0),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  reviewCount: z.coerce.number().int().min(0).optional().default(0),
  badge: z.string().optional().default(""),
  hasDetailPage: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const pricingSchema = z.object({
  basePrice: z.coerce.number().min(0),
  currency: z.string().min(1, "Currency is required"),
  allowsFlights: z.boolean(),
  tourTypes: z.array(z.string().min(1)).min(1, "Add at least one tour type"),
});

export const tourPackageSchema = tourPackageBasicsSchema.extend({
  inclusions: z.array(inclusionSchema).min(1),
  itinerary: z.array(itineraryDaySchema).min(1),
  detailSections: z.array(detailSectionSchema),
  hotels: z.array(hotelSchema),
  terms: z.array(termSchema),
  pricing: pricingSchema,
});

export function validatePackagePriceAboveStartingPrice(
  startingPrice: number,
  packagePrice: number
): string | null {
  if (packagePrice <= startingPrice) {
    return `Price must be greater than starting price (${startingPrice}).`;
  }
  return null;
}

export const createHolidayPackageSchema = z
  .object({
    destination: destinationSchema,
    tourPackage: tourPackageSchema,
  })
  .superRefine((data, ctx) => {
    if (data.tourPackage.price <= data.destination.startingPrice) {
      ctx.addIssue({
        code: "custom",
        message: `Price must be greater than starting price (${data.destination.startingPrice}).`,
        path: ["tourPackage", "price"],
      });
    }
  });

export type CreateHolidayPackagePayload = z.infer<typeof createHolidayPackageSchema>;

export type CreateHolidayPackageResponse = {
  message: string;
  destinationId: number;
  destinationSlug: string;
  destinationName: string;
  packageInternalId: number;
  pkgId: string;
  packageSlug: string;
  categoryCode: string;
  detailUrl: string;
  listingUrl: string;
  counts: Record<string, number>;
  createdAt: string;
};

export type HolidayPackageFormState = CreateHolidayPackagePayload;

export type HolidayPackageDestinationRegion = HolidayPackageFormState["destination"]["region"];

export function parseHolidayPackageRegionParam(
  value: string | null | undefined
): HolidayPackageDestinationRegion | undefined {
  if (value === "international" || value === "india") return value;
  return undefined;
}

export function parseHolidayPackageCategoryParam(
  value: string | null | undefined
): HolidayPackageCategoryCode | undefined {
  const code = value?.trim();
  if (!code) return undefined;
  return (holidayPackageCategoryCodes as readonly string[]).includes(code)
    ? (code as HolidayPackageCategoryCode)
    : undefined;
}

export type CreatePackagePrefillParams = {
  region: HolidayPackageDestinationRegion;
  destinationSlug: string;
  destinationName: string;
  startingPrice?: number;
  categoryCode: HolidayPackageCategoryCode;
};

export function buildCreatePackagePrefillUrl(
  params: CreatePackagePrefillParams
): string {
  const q = new URLSearchParams();
  q.set("region", params.region);
  q.set("destinationSlug", params.destinationSlug);
  q.set("destinationName", params.destinationName);
  if (params.startingPrice != null && !Number.isNaN(params.startingPrice)) {
    q.set("startingPrice", String(params.startingPrice));
  }
  q.set("categoryCode", params.categoryCode);
  return `/supervision/holidays/create-package?${q.toString()}`;
}

export function applyCreatePackagePrefillFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): { form: HolidayPackageFormState; initialStep: number } {
  const region = parseHolidayPackageRegionParam(searchParams.get("region"));
  const destinationSlug = searchParams.get("destinationSlug")?.trim() ?? "";
  const destinationName = searchParams.get("destinationName")?.trim() ?? "";
  const startingPriceRaw = searchParams.get("startingPrice");
  const startingPrice =
    startingPriceRaw != null && startingPriceRaw !== ""
      ? Number(startingPriceRaw)
      : undefined;
  const categoryCode = parseHolidayPackageCategoryParam(searchParams.get("categoryCode"));

  const form = defaultHolidayPackageFormState(region);
  const destinationPrefilled = Boolean(destinationName || destinationSlug);

  if (destinationName) {
    form.destination.name = destinationName;
    form.destination.slug =
      destinationSlug || destinationSlugFromName(destinationName);
  } else if (destinationSlug) {
    form.destination.slug = destinationSlug;
  }

  if (startingPrice != null && !Number.isNaN(startingPrice)) {
    form.destination.startingPrice = startingPrice;
  }

  if (categoryCode) {
    form.tourPackage.categoryCode = categoryCode;
  }

  const initialStep =
    destinationPrefilled && categoryCode ? 1 : 0;

  return { form, initialStep };
}

export const defaultHolidayPackageFormState = (
  region?: HolidayPackageDestinationRegion
): HolidayPackageFormState => ({
  destination: {
    slug: "",
    name: "",
    region: region ?? "international",
    description: "",
    heroImageUrl: "",
    startingPrice: 0,
    active: true,
    sortOrder: 1,
  },
  tourPackage: {
    pkgId: "",
    slug: "",
    categoryCode: "senior",
    title: "",
    imageUrl: "",
    price: 0,
    days: 5,
    nights: 4,
    rating: 4.5,
    reviewCount: 0,
    badge: "",
    hasDetailPage: true,
    sortOrder: 1,
    active: true,
    inclusions: [],
    itinerary: syncItineraryToPackageDays([], 5),
    detailSections: [],
    hotels: [],
    terms: [],
    pricing: {
      basePrice: 0,
      currency: "INR",
      allowsFlights: true,
      tourTypes: ["Standard"],
    },
  },
});

export const WIZARD_STEPS = [
  { id: "destination", title: "Destination" },
  { id: "package", title: "Package" },
  { id: "inclusions", title: "Inclusions" },
  { id: "itinerary", title: "Itinerary" },
  { id: "sections", title: "Detail sections" },
  { id: "hotels", title: "Hotels" },
  { id: "terms", title: "Terms" },
  { id: "pricing", title: "Pricing" },
  { id: "review", title: "Review" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];
