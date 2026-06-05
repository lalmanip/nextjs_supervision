"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { HolidayImageUploadField } from "@/components/common/holiday-image-upload-field";
import { cn } from "@/lib/utils";
import {
  CheckboxField,
  fieldClass,
  FormField,
  NumberStepperInput,
  textareaClass,
} from "./form-controls";
import {
  createHolidayPackageSchema,
  destinationSlugFromName,
  destinationSchema,
  packageSlugFromTitle,
  packageTypeFromPkgId,
  pricingSchema,
  tourPackageBasicsSchema,
  validatePackagePriceAboveStartingPrice,
  buildInclusionsFromLabels,
  HOLIDAY_PACKAGE_CATEGORY_OPTIONS,
  HOLIDAY_PACKAGE_DETAIL_SECTION_TYPE_OPTIONS,
  HOLIDAY_PACKAGE_INCLUSION_OPTIONS,
  HOLIDAY_PACKAGE_TYPE_OPTIONS,
  isInclusionOptionSelected,
  type HolidayPackageCategoryCode,
  type HolidayPackageFormState,
  type WizardStepId,
} from "@/types/holiday-package-create";

export type HolidayPackageWizardLocks = {
  pkgId?: boolean;
};

export type ValidateHolidayPackageStepOptions = {
  packageType?: string;
};

export function validateHolidayPackageStep(
  step: WizardStepId,
  form: HolidayPackageFormState,
  options?: ValidateHolidayPackageStepOptions
): string | null {
  const run = (result: { success: boolean; error?: z.ZodError }) => {
    if (!result.success && result.error) {
      return result.error.issues[0]?.message ?? "Validation failed";
    }
    return null;
  };

  switch (step) {
    case "destination": {
      const destination = {
        ...form.destination,
        slug:
          form.destination.slug ||
          destinationSlugFromName(form.destination.name),
      };
      return run(destinationSchema.safeParse(destination));
    }
    case "package": {
      if (options?.packageType !== undefined && !options.packageType.trim()) {
        return "Package type is required";
      }
      if (!form.tourPackage.title.trim()) {
        return "Title is required";
      }
      if (!form.tourPackage.price || form.tourPackage.price < 1) {
        return "Price is required";
      }
      const {
        pkgId,
        slug,
        categoryCode,
        title,
        imageUrl,
        price,
        days,
        nights,
        rating,
        reviewCount,
        badge,
        hasDetailPage,
        sortOrder,
        active,
      } = form.tourPackage;
      const basicsErr = run(
        tourPackageBasicsSchema.safeParse({
          pkgId,
          slug: slug || packageSlugFromTitle(title),
          categoryCode,
          title,
          imageUrl,
          price,
          days,
          nights,
          rating,
          reviewCount,
          badge,
          hasDetailPage,
          sortOrder,
          active,
        })
      );
      if (basicsErr) return basicsErr;
      return validatePackagePriceAboveStartingPrice(
        form.destination.startingPrice,
        form.tourPackage.price
      );
    }
    case "inclusions":
      if (form.tourPackage.inclusions.length === 0) {
        return "Select at least one inclusion";
      }
      return null;
    case "itinerary": {
      const expectedDays = Math.max(1, form.tourPackage.days);
      if (form.tourPackage.itinerary.length !== expectedDays) {
        return `Itinerary must have ${expectedDays} day(s) (from Package step).`;
      }
      for (const day of form.tourPackage.itinerary) {
        if (day.dayNumber !== day.sortOrder) {
          return "Sort order must match day number.";
        }
        if (!day.title.trim()) {
          return `Day ${day.dayNumber}: title is required`;
        }
      }
      return null;
    }
    case "sections": {
      for (const section of form.tourPackage.detailSections) {
        if (!section.content.trim()) {
          return "Each detail section must have content";
        }
      }
      return null;
    }
    case "hotels":
    case "terms":
      return null;
    case "pricing":
      return run(pricingSchema.safeParse(form.tourPackage.pricing));
    case "review":
      return run(createHolidayPackageSchema.safeParse(form));
    default:
      return null;
  }
}

export function HolidayPackageWizardStepContent({
  stepId,
  form,
  patchDestination,
  patchPackage,
  locks,
  packageType,
  onPackageTypeChange,
}: {
  stepId: WizardStepId;
  form: HolidayPackageFormState;
  patchDestination: (patch: Partial<HolidayPackageFormState["destination"]>) => void;
  patchPackage: (
    patch: Partial<Omit<HolidayPackageFormState["tourPackage"], "pricing">> & {
      pricing?: Partial<HolidayPackageFormState["tourPackage"]["pricing"]>;
    }
  ) => void;
  locks?: HolidayPackageWizardLocks;
  packageType?: string;
  onPackageTypeChange?: (value: string) => void;
}) {
  if (stepId === "destination") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField
          label="Destination Name"
          htmlFor="dest-name"
          hint="eg. Mauritius"
          required
        >
          <input
            id="dest-name"
            className={fieldClass}
            required
            value={form.destination.name}
            onChange={(e) => patchDestination({ name: e.target.value })}
          />
        </FormField>
        <FormField label="Region" htmlFor="dest-region">
          <select
            id="dest-region"
            className={fieldClass}
            value={form.destination.region}
            onChange={(e) =>
              patchDestination({
                region: e.target.value as "international" | "india",
              })
            }
          >
            <option value="international">International</option>
            <option value="india">India</option>
          </select>
        </FormField>
        <FormField label="Starting price" htmlFor="dest-price" hint="eg. 37500" required>
          <input
            id="dest-price"
            type="number"
            required
            min={1}
            className={fieldClass}
            value={form.destination.startingPrice || ""}
            onChange={(e) =>
              patchDestination({ startingPrice: Number(e.target.value) || 0 })
            }
          />
        </FormField>
        <FormField label="Sort order" htmlFor="dest-sort">
          <input
            id="dest-sort"
            type="number"
            className={fieldClass}
            value={form.destination.sortOrder}
            onChange={(e) =>
              patchDestination({ sortOrder: Number(e.target.value) || 0 })
            }
          />
        </FormField>
        <HolidayImageUploadField
          id="dest-hero"
          label="Hero image"
          kind="destination-hero"
          className="lg:col-span-3"
          hint="Upload a photo or paste a URL. Saved packages use this for the destination hero on vivance_ui."
          value={form.destination.heroImageUrl}
          onChange={(heroImageUrl) => patchDestination({ heroImageUrl })}
        />
        <div className="flex items-end pb-2">
          <CheckboxField
            label="Active"
            checked={form.destination.active}
            onChange={(active) => patchDestination({ active })}
          />
        </div>
        <FormField
          label="Description"
          className="lg:col-span-4"
          htmlFor="dest-desc"
          hint="eg. Marvelous Mauritius"
        >
          <textarea
            id="dest-desc"
            className={textareaClass}
            value={form.destination.description}
            onChange={(e) => patchDestination({ description: e.target.value })}
          />
        </FormField>
      </div>
    );
  }

  if (stepId === "package") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Category code" htmlFor="pkg-categoryCode">
          <select
            id="pkg-categoryCode"
            className={fieldClass}
            value={form.tourPackage.categoryCode}
            onChange={(e) =>
              patchPackage({
                categoryCode: e.target.value as HolidayPackageCategoryCode,
              })
            }
          >
            {HOLIDAY_PACKAGE_CATEGORY_OPTIONS.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        {onPackageTypeChange ? (
          <FormField
            label="Package Type"
            htmlFor="pkg-packageType"
            hint="eg. Classic, Premium"
            required
          >
            <input
              id="pkg-packageType"
              list="holiday-package-type-options"
              className={fieldClass}
              required
              value={packageType ?? ""}
              onChange={(e) => onPackageTypeChange(e.target.value)}
              placeholder="Select or type a package type"
            />
            <datalist id="holiday-package-type-options">
              {HOLIDAY_PACKAGE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            {form.tourPackage.pkgId ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Package ID: {form.tourPackage.pkgId}
              </p>
            ) : null}
          </FormField>
        ) : (
          <FormField
            label="Package Type"
            htmlFor="pkg-packageType-readonly"
            hint="eg. Classic, Premium"
          >
            <input
              id="pkg-packageType-readonly"
              className={fieldClass}
              disabled
              readOnly
              value={
                packageTypeFromPkgId(form.tourPackage.pkgId) ||
                form.tourPackage.pkgId
              }
            />
            {form.tourPackage.pkgId ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Package ID: {form.tourPackage.pkgId}
              </p>
            ) : null}
          </FormField>
        )}
        <FormField
          label="Title"
          htmlFor="pkg-title"
          hint="eg. Mauritius Classic Package"
          required
        >
          <input
            id="pkg-title"
            className={fieldClass}
            required
            value={form.tourPackage.title}
            onChange={(e) => patchPackage({ title: e.target.value })}
          />
        </FormField>
        <HolidayImageUploadField
          id="pkg-image"
          label="Package image"
          kind="package"
          className="lg:col-span-2"
          hint="Shown on package cards in vivance_ui."
          value={form.tourPackage.imageUrl}
          onChange={(imageUrl) => patchPackage({ imageUrl })}
        />
        <FormField label="Badge" htmlFor="pkg-badge" hint="eg. Recommended">
          <input
            id="pkg-badge"
            className={fieldClass}
            value={form.tourPackage.badge}
            onChange={(e) => patchPackage({ badge: e.target.value })}
          />
        </FormField>
        <FormField
          label="Price"
          htmlFor="pkg-price"
          hint={`Must be greater than starting price (${form.destination.startingPrice})`}
          required
        >
          <input
            id="pkg-price"
            type="number"
            required
            min={form.destination.startingPrice + 1}
            step="0.01"
            className={fieldClass}
            value={form.tourPackage.price || ""}
            onChange={(e) => patchPackage({ price: Number(e.target.value) || 0 })}
          />
        </FormField>
        <FormField label="Days" htmlFor="pkg-days">
          <NumberStepperInput
            id="pkg-days"
            aria-label="Days"
            min={1}
            value={form.tourPackage.days}
            onChange={(days) => patchPackage({ days })}
          />
        </FormField>
        <FormField label="Nights" htmlFor="pkg-nights">
          <NumberStepperInput
            id="pkg-nights"
            aria-label="Nights"
            min={0}
            value={form.tourPackage.nights}
            onChange={(nights) => patchPackage({ nights })}
          />
        </FormField>
        <FormField label="Rating" htmlFor="pkg-rating">
          <input
            id="pkg-rating"
            type="number"
            step="0.1"
            className={fieldClass}
            value={form.tourPackage.rating ?? ""}
            onChange={(e) => patchPackage({ rating: Number(e.target.value) || 0 })}
          />
        </FormField>
        <FormField label="Review count" htmlFor="pkg-reviews">
          <input
            id="pkg-reviews"
            type="number"
            className={fieldClass}
            value={form.tourPackage.reviewCount ?? ""}
            onChange={(e) => patchPackage({ reviewCount: Number(e.target.value) || 0 })}
          />
        </FormField>
        <FormField label="Sort order" htmlFor="pkg-sort">
          <input
            id="pkg-sort"
            type="number"
            className={fieldClass}
            value={form.tourPackage.sortOrder}
            onChange={(e) => patchPackage({ sortOrder: Number(e.target.value) || 0 })}
          />
        </FormField>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:col-span-4">
          <CheckboxField
            label="Has detail page"
            checked={form.tourPackage.hasDetailPage}
            onChange={(hasDetailPage) => patchPackage({ hasDetailPage })}
          />
          <CheckboxField
            label="Active"
            checked={form.tourPackage.active}
            onChange={(active) => patchPackage({ active })}
          />
        </div>
      </div>
    );
  }

  if (stepId === "inclusions") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Select all that apply. Selected items are sent to the API with a fixed sort order.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {HOLIDAY_PACKAGE_INCLUSION_OPTIONS.map(({ label }) => {
            const checked = isInclusionOptionSelected(form.tourPackage.inclusions, label);
            return (
              <label
                key={label}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  checked
                    ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                    : "border-zinc-200 dark:border-zinc-800"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 accent-primary"
                  checked={checked}
                  onChange={(e) => {
                    const current = form.tourPackage.inclusions
                      .map((i) => i.label)
                      .filter((l) =>
                        HOLIDAY_PACKAGE_INCLUSION_OPTIONS.some((o) => o.label === l)
                      );
                    const nextLabels = e.target.checked
                      ? [...current, label]
                      : current.filter((l) => l !== label);
                    patchPackage({
                      inclusions: buildInclusionsFromLabels(nextLabels),
                    });
                  }}
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (stepId === "itinerary") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {form.tourPackage.days} day slot{form.tourPackage.days === 1 ? "" : "s"} from the
          Package step. Sort order is set automatically to match the day number.
        </p>
        {form.tourPackage.itinerary.map((day, di) => (
          <div key={di} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">Day {day.dayNumber}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Sort order: {day.sortOrder}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Title" className="sm:col-span-2" required>
                <input
                  className={fieldClass}
                  required
                  value={day.title}
                  onChange={(e) => {
                    const next = [...form.tourPackage.itinerary];
                    next[di] = { ...day, title: e.target.value };
                    patchPackage({ itinerary: next });
                  }}
                />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <textarea
                  className={textareaClass}
                  value={day.description}
                  onChange={(e) => {
                    const next = [...form.tourPackage.itinerary];
                    next[di] = { ...day, description: e.target.value };
                    patchPackage({ itinerary: next });
                  }}
                />
              </FormField>
              <FormField label="Meals" hint="eg. Breakfast, Lunch, Dinner, None">
                <input
                  className={fieldClass}
                  value={day.meals}
                  onChange={(e) => {
                    const next = [...form.tourPackage.itinerary];
                    next[di] = { ...day, meals: e.target.value };
                    patchPackage({ itinerary: next });
                  }}
                />
              </FormField>
              <FormField label="Accommodation">
                <input
                  className={fieldClass}
                  value={day.accommodation}
                  onChange={(e) => {
                    const next = [...form.tourPackage.itinerary];
                    next[di] = { ...day, accommodation: e.target.value };
                    patchPackage({ itinerary: next });
                  }}
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium leading-none">Highlights</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  eg. Sunset views, Beach Leisure
                </span>
              </div>
              {day.highlights.map((h, hi) => (
                <div key={hi} className="flex gap-2">
                  <input
                    className={fieldClass}
                    aria-label={`Highlight ${hi + 1} for day ${day.dayNumber}`}
                    value={h.highlight}
                    onChange={(e) => {
                      const next = [...form.tourPackage.itinerary];
                      const highlights = [...day.highlights];
                      highlights[hi] = { ...h, highlight: e.target.value };
                      next[di] = { ...day, highlights };
                      patchPackage({ itinerary: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [...form.tourPackage.itinerary];
                      next[di] = {
                        ...day,
                        highlights: day.highlights.filter((_, j) => j !== hi),
                      };
                      patchPackage({ itinerary: next });
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = [...form.tourPackage.itinerary];
                  next[di] = {
                    ...day,
                    highlights: [
                      ...day.highlights,
                      { highlight: "", sortOrder: day.highlights.length + 1 },
                    ],
                  };
                  patchPackage({ itinerary: next });
                }}
              >
                Add highlight
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stepId === "sections") {
    return (
      <ArrayEditor<HolidayPackageFormState["tourPackage"]["detailSections"][number]>
        emptyItem={{ sectionType: "highlights", content: "", sortOrder: 1 }}
        items={form.tourPackage.detailSections}
        onChange={(detailSections) => patchPackage({ detailSections })}
        renderItem={(item, _i, update, remove) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Section type">
              <select
                className={fieldClass}
                value={item.sectionType}
                onChange={(e) =>
                  update({
                    sectionType: e.target.value as typeof item.sectionType,
                  })
                }
              >
                {HOLIDAY_PACKAGE_DETAIL_SECTION_TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Sort order">
              <input
                type="number"
                className={fieldClass}
                value={item.sortOrder}
                onChange={(e) => update({ sortOrder: Number(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Content" className="sm:col-span-2">
              <textarea
                className={textareaClass}
                value={item.content}
                onChange={(e) => update({ content: e.target.value })}
              />
            </FormField>
            <Button type="button" variant="outline" size="sm" onClick={remove}>
              Remove
            </Button>
          </div>
        )}
        addLabel="Add detail section"
      />
    );
  }

  if (stepId === "hotels") {
    return (
      <ArrayEditor
        emptyItem={{ name: "", nights: "", mealPlan: "", sortOrder: 1 }}
        items={form.tourPackage.hotels}
        onChange={(hotels) => patchPackage({ hotels })}
        renderItem={(item, _i, update, remove) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Name">
              <input
                className={fieldClass}
                value={item.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </FormField>
            <FormField label="Nights">
              <input
                className={fieldClass}
                value={item.nights}
                onChange={(e) => update({ nights: e.target.value })}
                placeholder="4 Nights"
              />
            </FormField>
            <FormField label="Meal plan" className="sm:col-span-2">
              <input
                className={fieldClass}
                value={item.mealPlan}
                onChange={(e) => update({ mealPlan: e.target.value })}
              />
            </FormField>
            <FormField label="Sort order">
              <input
                type="number"
                className={fieldClass}
                value={item.sortOrder}
                onChange={(e) => update({ sortOrder: Number(e.target.value) || 0 })}
              />
            </FormField>
            <Button type="button" variant="outline" size="sm" onClick={remove}>
              Remove
            </Button>
          </div>
        )}
        addLabel="Add hotel"
      />
    );
  }

  if (stepId === "terms") {
    return (
      <ArrayEditor
        emptyItem={{ termText: "", sortOrder: 1 }}
        items={form.tourPackage.terms}
        onChange={(terms) => patchPackage({ terms })}
        renderItem={(item, _i, update, remove) => (
          <div className="space-y-2">
            <FormField label="Term text">
              <textarea
                className={textareaClass}
                value={item.termText}
                onChange={(e) => update({ termText: e.target.value })}
              />
            </FormField>
            <FormField label="Sort order">
              <input
                type="number"
                className={fieldClass}
                value={item.sortOrder}
                onChange={(e) => update({ sortOrder: Number(e.target.value) || 0 })}
              />
            </FormField>
            <Button type="button" variant="outline" size="sm" onClick={remove}>
              Remove
            </Button>
          </div>
        )}
        addLabel="Add term"
      />
    );
  }

  if (stepId === "pricing") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Base price">
          <input
            type="number"
            className={fieldClass}
            value={form.tourPackage.pricing.basePrice || ""}
            onChange={(e) =>
              patchPackage({
                pricing: { basePrice: Number(e.target.value) || 0 },
              })
            }
          />
        </FormField>
        <FormField label="Currency">
          <input
            className={fieldClass}
            value={form.tourPackage.pricing.currency}
            onChange={(e) => patchPackage({ pricing: { currency: e.target.value } })}
          />
        </FormField>
        <FormField label="Tour types (comma-separated)" className="sm:col-span-2">
          <input
            className={fieldClass}
            value={form.tourPackage.pricing.tourTypes.join(", ")}
            onChange={(e) =>
              patchPackage({
                pricing: {
                  tourTypes: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            placeholder="Standard, Value, Premium"
          />
        </FormField>
        <CheckboxField
          label="Allows flights"
          checked={form.tourPackage.pricing.allowsFlights}
          onChange={(allowsFlights) => patchPackage({ pricing: { allowsFlights } })}
        />
      </div>
    );
  }

  if (stepId === "review") {
    return (
      <pre className="max-h-[28rem] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-950">
        {JSON.stringify(form, null, 2)}
      </pre>
    );
  }

  return null;
}

function ArrayEditor<T extends { sortOrder: number }>({
  items,
  onChange,
  emptyItem,
  renderItem,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  emptyItem: T;
  renderItem: (
    item: T,
    index: number,
    update: (patch: Partial<T>) => void,
    remove: () => void
  ) => React.ReactNode;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border p-3">
          {renderItem(
            item,
            i,
            (patch) => {
              const next = [...items];
              next[i] = { ...item, ...patch };
              onChange(next);
            },
            () => onChange(items.filter((_, j) => j !== i))
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...items, { ...emptyItem, sortOrder: items.length + 1 } as T])
        }
      >
        {addLabel}
      </Button>
    </div>
  );
}
