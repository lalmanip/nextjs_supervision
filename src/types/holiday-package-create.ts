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
  sectionType: z.string().min(1, "Section type is required"),
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

export const destinationSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  name: z.string().min(1, "Name is required"),
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

export const defaultHolidayPackageFormState = (): HolidayPackageFormState => ({
  destination: {
    slug: "",
    name: "",
    region: "international",
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
