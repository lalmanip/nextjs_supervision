import {
  buildInclusionsFromLabels,
  createHolidayPackageSchema,
  defaultHolidayPackageFormState,
  holidayPackageCategoryCodes,
  normalizeDetailSectionType,
  syncItineraryToPackageDays,
  type CreateHolidayPackagePayload,
  type HolidayPackageCategoryCode,
  type HolidayPackageFormState,
  type ItineraryDayInput,
} from "@/types/holiday-package-create";

export type HolidayPackageDetailContext = {
  region?: HolidayRegion;
  categoryCode?: string;
  destinationSlug?: string;
  destinationName?: string;
  startingPrice?: number;
};

export type HolidayRegion = "international" | "india";

export type TrendingDestinationOption = {
  slug: string;
  name: string;
  region?: HolidayRegion;
  startingPrice?: number;
  description?: string;
};

export type HolidayCategoryOption = {
  code: string;
  label: string;
};

export type DestinationPackageOption = {
  pkgId: string;
  slug?: string;
  title?: string;
  categoryCode?: string;
  price?: number;
  days?: number;
  nights?: number;
};

export function pickString(
  row: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return undefined;
}

export function pickNumber(
  row: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

export function mapTrendingDestination(
  row: Record<string, unknown>
): TrendingDestinationOption | null {
  const slug = pickString(row, ["slug", "destinationSlug"]);
  const name = pickString(row, ["name", "destinationName", "title"]);
  if (!slug || !name) return null;
  const regionRaw = pickString(row, ["region"]);
  const region =
    regionRaw === "india" || regionRaw === "international"
      ? regionRaw
      : undefined;
  return {
    slug,
    name,
    region,
    startingPrice: pickNumber(row, ["startingPrice", "starting_price"]),
    description: pickString(row, ["description"]),
  };
}

export function mapHolidayCategory(
  row: Record<string, unknown>
): HolidayCategoryOption | null {
  const code = pickString(row, [
    "code",
    "categoryCode",
    "category_code",
    "id",
  ]);
  if (!code) return null;
  const label =
    pickString(row, ["label", "name", "title", "displayName"]) ?? code;
  return { code, label };
}

export function mapDestinationPackage(
  row: Record<string, unknown>
): DestinationPackageOption | null {
  const pkgId = pickString(row, ["pkgId", "pkg_id", "packageId", "id"]);
  if (!pkgId) return null;
  return {
    pkgId,
    slug: pickString(row, ["slug", "packageSlug"]),
    title: pickString(row, ["title", "name", "packageTitle"]),
    categoryCode: pickString(row, ["categoryCode", "category_code"]),
    price: pickNumber(row, ["price"]),
    days: pickNumber(row, ["days"]),
    nights: pickNumber(row, ["nights"]),
  };
}

function unwrapDetailPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.destination && o.tourPackage) return o;
  if (o.pkgId) return o;
  for (const key of ["data", "package", "result", "response"]) {
    const inner = o[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const unwrapped = unwrapDetailPayload(inner);
      if (unwrapped) return unwrapped;
    }
  }
  return o;
}

function coerceCategoryCode(
  value: string | undefined,
  fallback: string | undefined
): HolidayPackageCategoryCode {
  const candidate = value ?? fallback ?? "senior";
  if (
    holidayPackageCategoryCodes.includes(
      candidate as (typeof holidayPackageCategoryCodes)[number]
    )
  ) {
    return candidate as HolidayPackageCategoryCode;
  }
  return "senior";
}

function mapInclusionsFromApi(raw: unknown): { label: string; sortOrder: number }[] {
  if (!Array.isArray(raw)) return [];
  const labels = raw.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  const matched = buildInclusionsFromLabels(labels);
  if (matched.length > 0) return matched;
  return labels.map((label, i) => ({ label, sortOrder: i + 1 }));
}

function mapItineraryFromApi(rows: unknown, packageDays: number): ItineraryDayInput[] {
  if (!Array.isArray(rows)) {
    return syncItineraryToPackageDays([], packageDays);
  }
  const mapped: ItineraryDayInput[] = rows.map((row, i) => {
    const r = row as Record<string, unknown>;
    const dayNumber = pickNumber(r, ["dayNumber", "day"]) ?? i + 1;
    const highlightStrings = Array.isArray(r.highlights)
      ? r.highlights.filter(
          (h): h is string => typeof h === "string" && h.trim().length > 0
        )
      : Array.isArray(r.highlightsList)
        ? (r.highlightsList as unknown[]).filter(
            (h): h is string => typeof h === "string" && h.trim().length > 0
          )
        : [];
    const highlights =
      highlightStrings.length > 0
        ? highlightStrings.map((highlight, hi) => ({
            highlight,
            sortOrder: hi + 1,
          }))
        : [{ highlight: "", sortOrder: 1 }];
    return {
      dayNumber,
      title: pickString(r, ["title"]) ?? "",
      description: pickString(r, ["description"]) ?? "",
      meals: pickString(r, ["meals"]) ?? "",
      accommodation: pickString(r, ["accommodation"]) ?? "",
      sortOrder: dayNumber,
      highlights,
    };
  });
  return syncItineraryToPackageDays(mapped, packageDays);
}

function mapTermsFromApi(raw: unknown): { termText: string; sortOrder: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((termText, i) => ({ termText, sortOrder: i + 1 }));
}

function mapHotelsFromApi(raw: unknown): {
  name: string;
  nights: string;
  mealPlan: string;
  sortOrder: number;
}[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const name = pickString(r, ["name", "hotelName"]);
      if (!name) return null;
      return {
        name,
        nights: pickString(r, ["nights", "night"]) ?? "",
        mealPlan: pickString(r, ["mealPlan", "meal_plan"]) ?? "",
        sortOrder: pickNumber(r, ["sortOrder", "sort_order"]) ?? i + 1,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function mapDetailSectionsFromApi(
  details: Record<string, unknown> | undefined
): { sectionType: string; content: string; sortOrder: number }[] {
  if (!details) return [];
  const sections: { sectionType: string; content: string; sortOrder: number }[] = [];
  let sortOrder = 1;

  const pushStrings = (sectionType: string, values: unknown) => {
    if (!Array.isArray(values)) return;
    for (const v of values) {
      if (typeof v === "string" && v.trim()) {
        sections.push({ sectionType, content: v.trim(), sortOrder: sortOrder++ });
      }
    }
  };

  pushStrings("highlights", details.highlights);
  pushStrings("inclusions", details.inclusions);
  pushStrings("exclusions", details.exclusions);

  for (const [key, sectionType] of [
    ["flightsNote", "flights_note"],
    ["visaNote", "visa_note"],
  ] as const) {
    const text = details[key];
    if (typeof text === "string" && text.trim()) {
      sections.push({ sectionType, content: text.trim(), sortOrder: sortOrder++ });
    }
  }

  return sections;
}

/** Public GET /packages/{pkgId} returns a flat package object (not admin create shape). */
function mapFlatPackageDetailToForm(
  o: Record<string, unknown>,
  ctx: HolidayPackageDetailContext
): HolidayPackageFormState {
  const defaults = defaultHolidayPackageFormState();
  const days = pickNumber(o, ["days"]) ?? defaults.tourPackage.days;
  const price = pickNumber(o, ["price"]) ?? defaults.tourPackage.price;
  const startingPrice =
    ctx.startingPrice ??
    pickNumber(o, ["startingPrice", "destinationStartingPrice"]) ??
    (price > 0 ? Math.max(0, Math.floor(price * 0.9)) : 0);

  const pricingRaw =
    o.pricing && typeof o.pricing === "object"
      ? (o.pricing as Record<string, unknown>)
      : {};

  const destinationSlug =
    ctx.destinationSlug ?? pickString(o, ["destinationSlug", "destination_slug"]) ?? "";
  const destinationName =
    ctx.destinationName ?? pickString(o, ["destinationName", "destination_name"]) ?? "";

  const details =
    o.details && typeof o.details === "object"
      ? (o.details as Record<string, unknown>)
      : undefined;

  const hotelsFromDetails = details ? mapHotelsFromApi(details.hotels) : [];
  const hotels = mapHotelsFromApi(o.hotels);
  const mergedHotels = hotels.length > 0 ? hotels : hotelsFromDetails;

  const detailSections = mapDetailSectionsFromApi(details);
  const detailSectionsTop = Array.isArray(o.detailSections)
    ? (o.detailSections as unknown[])
        .map((row, i) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const sectionTypeRaw = pickString(r, ["sectionType", "section_type"]);
          const content = pickString(r, ["content"]);
          if (!sectionTypeRaw || !content) return null;
          return {
            sectionType: normalizeDetailSectionType(sectionTypeRaw),
            content,
            sortOrder: pickNumber(r, ["sortOrder", "sort_order"]) ?? i + 1,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];

  return {
    destination: {
      slug: destinationSlug,
      name: destinationName,
      region: ctx.region ?? defaults.destination.region,
      description: pickString(o, ["destinationDescription", "description"]) ?? "",
      heroImageUrl:
        pickString(o, ["heroImageUrl", "destinationHeroImageUrl"]) ?? "",
      startingPrice,
      active: typeof o.destinationActive === "boolean" ? o.destinationActive : true,
      sortOrder: pickNumber(o, ["destinationSortOrder"]) ?? 1,
    },
    tourPackage: {
      pkgId: pickString(o, ["pkgId", "pkg_id"]) ?? "",
      slug: pickString(o, ["slug", "packageSlug"]) ?? "",
      categoryCode: coerceCategoryCode(
        pickString(o, ["categoryCode", "category_code"]),
        ctx.categoryCode
      ),
      title: pickString(o, ["title", "name"]) ?? "",
      imageUrl: pickString(o, ["imageUrl", "image", "image_url"]) ?? "",
      price,
      days,
      nights: pickNumber(o, ["nights"]) ?? Math.max(0, days - 1),
      rating: pickNumber(o, ["rating"]) ?? 0,
      reviewCount:
        pickNumber(o, ["reviewCount", "review_count", "comments"]) ?? 0,
      badge: pickString(o, ["badge"]) ?? "",
      hasDetailPage:
        typeof o.hasDetailPage === "boolean" ? o.hasDetailPage : true,
      sortOrder: pickNumber(o, ["sortOrder", "sort_order"]) ?? 1,
      active: typeof o.active === "boolean" ? o.active : true,
      inclusions: mapInclusionsFromApi(o.inclusions),
      itinerary: mapItineraryFromApi(o.itinerary, days),
      detailSections:
        detailSectionsTop.length > 0 ? detailSectionsTop : detailSections,
      hotels: mergedHotels,
      terms: mapTermsFromApi(o.terms),
      pricing: {
        basePrice:
          pickNumber(pricingRaw, ["basePrice", "base_price"]) ?? price,
        currency: pickString(pricingRaw, ["currency"]) ?? "INR",
        allowsFlights:
          typeof pricingRaw.allowsFlights === "boolean"
            ? pricingRaw.allowsFlights
            : true,
        tourTypes: Array.isArray(pricingRaw.tourTypes)
          ? pricingRaw.tourTypes.filter(
              (t): t is string => typeof t === "string" && t.trim().length > 0
            )
          : ["Standard"],
      },
    },
  };
}

function finalizeFormState(form: HolidayPackageFormState): HolidayPackageFormState {
  const withItinerary = {
    ...form,
    tourPackage: {
      ...form.tourPackage,
      itinerary: syncItineraryToPackageDays(
        form.tourPackage.itinerary,
        form.tourPackage.days
      ),
    },
  };
  const parsed = createHolidayPackageSchema.safeParse(withItinerary);
  return parsed.success ? parsed.data : withItinerary;
}

/** Map GET /packages/{pkgId} response into create/update form state. */
export function mapHolidayPackageDetailToForm(
  raw: unknown,
  ctx: HolidayPackageDetailContext = {}
): HolidayPackageFormState | null {
  const unwrapped = unwrapDetailPayload(raw);
  if (!unwrapped) return null;

  if (unwrapped.destination && unwrapped.tourPackage) {
    const parsed = createHolidayPackageSchema.safeParse(unwrapped);
    if (parsed.success) {
      return finalizeFormState(parsed.data);
    }
    const loose = unwrapped as Partial<CreateHolidayPackagePayload>;
    if (loose.destination && loose.tourPackage) {
      return finalizeFormState({
        ...defaultHolidayPackageFormState(),
        destination: {
          ...defaultHolidayPackageFormState().destination,
          ...loose.destination,
          region: ctx.region ?? loose.destination.region,
        },
        tourPackage: {
          ...defaultHolidayPackageFormState().tourPackage,
          ...loose.tourPackage,
          categoryCode: coerceCategoryCode(
            loose.tourPackage.categoryCode,
            ctx.categoryCode
          ),
          pricing: {
            ...defaultHolidayPackageFormState().tourPackage.pricing,
            ...(loose.tourPackage.pricing ?? {}),
          },
        },
      });
    }
  }

  if (pickString(unwrapped, ["pkgId", "pkg_id"])) {
    return finalizeFormState(mapFlatPackageDetailToForm(unwrapped, ctx));
  }

  return null;
}
