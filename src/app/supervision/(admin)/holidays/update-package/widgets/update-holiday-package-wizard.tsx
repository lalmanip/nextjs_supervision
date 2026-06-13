"use client";

import * as React from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  buildCreatePackagePrefillUrl,
  parseHolidayPackageCategoryParam,
  syncItineraryToPackageDays,
  WIZARD_STEPS,
  type HolidayPackageFormState,
} from "@/types/holiday-package-create";
import {
  applyDestinationHeaderToForm,
  mapDestinationHeader,
  mapDestinationPackage,
  mapHolidayCategory,
  mapHolidayPackageDetailToForm,
  mapTrendingDestination,
  type DestinationPackageOption,
  type HolidayCategoryOption,
  type HolidayRegion,
  type TrendingDestinationOption,
} from "@/types/holiday-package-lookup";
import {
  HolidayPackageWizardStepContent,
  validateHolidayPackageStep,
} from "../../create-package/widgets/holiday-package-wizard-shared";

const PICK_STEPS = [
  { id: "region", title: "Region" },
  { id: "destination", title: "Destination" },
  { id: "category", title: "Category" },
  { id: "package", title: "Package" },
] as const;

type PickStepId = (typeof PICK_STEPS)[number]["id"];

type TrendingApiOk = {
  status: "success";
  destinations: Record<string, unknown>[];
};

type CategoriesApiOk = {
  status: "success";
  categories: Record<string, unknown>[];
};

type PackagesApiOk = {
  status: "success";
  packages: Record<string, unknown>[];
};

type DestinationApiOk = {
  status: "success";
  destination: Record<string, unknown>;
};

type PackageDetailApiOk = {
  status: "success";
  data: unknown;
};

type UpdateApiOk = {
  status: "success";
  data: unknown;
};

type SubmitOutcome = {
  ok: boolean;
  message: string;
  status?: number;
  response: unknown;
};

type SelectionListTone = "default" | "active" | "inactive";

const selectionListToneClass: Record<
  SelectionListTone,
  { base: string; selected: string }
> = {
  default: {
    base: "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
    selected: "border-primary bg-primary/5 dark:bg-primary/10",
  },
  active: {
    base: "border-green-300 bg-green-50 hover:bg-green-100/80 dark:border-green-800 dark:bg-green-950/40 dark:hover:bg-green-950/60",
    selected:
      "border-green-600 bg-green-100 ring-1 ring-green-600/30 dark:border-green-500 dark:bg-green-950/70 dark:ring-green-500/30",
  },
  inactive: {
    base: "border-red-300 bg-red-50 hover:bg-red-100/80 dark:border-red-800 dark:bg-red-950/40 dark:hover:bg-red-950/60",
    selected:
      "border-red-600 bg-red-100 ring-1 ring-red-600/30 dark:border-red-500 dark:bg-red-950/70 dark:ring-red-500/30",
  },
};

function SelectionList<T extends { key: string }>({
  items,
  selectedKey,
  onSelect,
  renderLabel,
  renderMeta,
  tone = "default",
}: {
  items: T[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  renderLabel: (item: T) => string;
  renderMeta?: (item: T) => string | undefined;
  tone?: SelectionListTone;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">No options returned from API.</p>
    );
  }
  const toneClass = selectionListToneClass[tone];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const selected = selectedKey === item.key;
        const meta = renderMeta?.(item);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={cn(
              "rounded-lg border px-4 py-3 text-left transition-colors",
              selected ? toneClass.selected : toneClass.base
            )}
          >
            <span className="block text-sm font-medium">{renderLabel(item)}</span>
            {meta ? (
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{meta}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function UpdateHolidayPackageWizard() {
  const [phase, setPhase] = React.useState<"pick" | "edit">("pick");
  const [pickStep, setPickStep] = React.useState(0);
  const [editStep, setEditStep] = React.useState(0);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitOutcome, setSubmitOutcome] = React.useState<SubmitOutcome | null>(null);

  const [region, setRegion] = React.useState<HolidayRegion | null>("international");
  const [destinations, setDestinations] = React.useState<TrendingDestinationOption[]>([]);
  const [destinationSlug, setDestinationSlug] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<HolidayCategoryOption[]>([]);
  const [categoryCode, setCategoryCode] = React.useState<string | null>(null);
  const [packages, setPackages] = React.useState<DestinationPackageOption[]>([]);
  const [selectedPkgId, setSelectedPkgId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<HolidayPackageFormState | null>(null);

  const pickCurrent = PICK_STEPS[pickStep];
  const editCurrent = WIZARD_STEPS[editStep];

  const selectedDestination = destinations.find((d) => d.slug === destinationSlug);
  const activeDestinations = React.useMemo(
    () => destinations.filter((d) => d.active),
    [destinations]
  );
  const inactiveDestinations = React.useMemo(
    () => destinations.filter((d) => !d.active),
    [destinations]
  );
  const activePackages = React.useMemo(
    () => packages.filter((p) => p.active),
    [packages]
  );
  const inactivePackages = React.useMemo(
    () => packages.filter((p) => !p.active),
    [packages]
  );

  const renderDestinationMeta = (d: TrendingDestinationOption) =>
    [
      d.slug,
      d.startingPrice != null
        ? `from ₹ ${d.startingPrice.toLocaleString("en-IN")}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const renderPackageMeta = (p: DestinationPackageOption) =>
    [
      p.pkgId,
      p.days != null && p.nights != null ? `${p.days}D / ${p.nights}N` : null,
      p.price != null ? `₹ ${p.price.toLocaleString("en-IN")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const selectedCategory = categories.find((c) => c.code === categoryCode);
  const selectedPackage = packages.find((p) => p.pkgId === selectedPkgId);

  const createPackagePrefillHref = React.useMemo(() => {
    if (!region || !selectedDestination || !categoryCode) return null;
    const category = parseHolidayPackageCategoryParam(categoryCode);
    if (!category) return null;
    return buildCreatePackagePrefillUrl({
      region,
      destinationSlug: selectedDestination.slug,
      destinationName: selectedDestination.name,
      startingPrice: selectedDestination.startingPrice,
      categoryCode: category,
    });
  }, [region, selectedDestination, categoryCode]);

  const resetAll = () => {
    setPhase("pick");
    setPickStep(0);
    setEditStep(0);
    setStepError(null);
    setLoading(false);
    setSubmitting(false);
    setSubmitOutcome(null);
    setRegion("international");
    setDestinations([]);
    setDestinationSlug(null);
    setCategories([]);
    setCategoryCode(null);
    setPackages([]);
    setSelectedPkgId(null);
    setForm(null);
  };

  const loadDestinations = async (r: HolidayRegion) => {
    setLoading(true);
    setStepError(null);
    try {
      const { data } = await http.get<TrendingApiOk>(
        `/api/supervision/holidays/destinations/trending?region=${r}`
      );
      const list = (data.destinations ?? [])
        .map(mapTrendingDestination)
        .filter((x): x is TrendingDestinationOption => x !== null);
      setDestinations(list);
      if (list.length === 0) {
        setStepError("No destinations found for this region.");
      }
    } catch (e) {
      setStepError(getApiErrorMessage(e));
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    setStepError(null);
    try {
      const { data } = await http.get<CategoriesApiOk>(
        "/api/supervision/holidays/categories"
      );
      const list = (data.categories ?? [])
        .map(mapHolidayCategory)
        .filter((x): x is HolidayCategoryOption => x !== null);
      setCategories(list);
      if (list.length === 0) {
        setStepError("No categories returned from API.");
      }
    } catch (e) {
      setStepError(getApiErrorMessage(e));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async (slug: string, cat: string) => {
    setLoading(true);
    setStepError(null);
    try {
      const { data } = await http.get<PackagesApiOk>(
        `/api/supervision/holidays/destinations/${encodeURIComponent(slug)}/packages?categoryCode=${encodeURIComponent(cat)}`
      );
      const list = (data.packages ?? [])
        .map(mapDestinationPackage)
        .filter((x): x is DestinationPackageOption => x !== null);
      setPackages(list);
    } catch (e) {
      setStepError(getApiErrorMessage(e));
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDestinationDetail = async (slug: string) => {
    const { data } = await http.get<DestinationApiOk>(
      `/api/supervision/holidays/destinations/${encodeURIComponent(slug)}`
    );
    return mapDestinationHeader(data.destination ?? {});
  };

  const loadPackageDetail = async (pkgId: string) => {
    setLoading(true);
    setStepError(null);
    try {
      const slug = destinationSlug ?? undefined;
      const [packageRes, destinationHeader] = await Promise.all([
        http.get<PackageDetailApiOk>(
          `/api/supervision/holidays/packages/${encodeURIComponent(pkgId)}`
        ),
        slug ? loadDestinationDetail(slug).catch(() => null) : Promise.resolve(null),
      ]);
      const mapped = mapHolidayPackageDetailToForm(packageRes.data.data, {
        region: region ?? undefined,
        categoryCode: categoryCode ?? selectedPackage?.categoryCode,
        destinationSlug: slug,
        destinationName: destinationHeader?.name ?? selectedDestination?.name,
        startingPrice:
          destinationHeader?.startingPrice ?? selectedDestination?.startingPrice,
      });
      if (!mapped) {
        setStepError("Could not map package details into the form. Check API response shape.");
        return;
      }
      const withDestination = destinationHeader
        ? applyDestinationHeaderToForm(mapped, destinationHeader, region ?? undefined)
        : mapped;
      setForm(withDestination);
      setPhase("edit");
      setEditStep(0);
      toast.success(`Loaded ${pkgId}`);
    } catch (e) {
      setStepError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const pickNext = async () => {
    setStepError(null);
    const id = pickCurrent.id;

    if (id === "region") {
      if (!region) {
        setStepError("Select a region.");
        return;
      }
      setDestinationSlug(null);
      setCategoryCode(null);
      setPackages([]);
      setSelectedPkgId(null);
      await loadDestinations(region);
      setPickStep(1);
      return;
    }

    if (id === "destination") {
      if (!destinationSlug) {
        setStepError("Select a destination.");
        return;
      }
      setCategoryCode(null);
      setPackages([]);
      setSelectedPkgId(null);
      await loadCategories();
      setPickStep(2);
      return;
    }

    if (id === "category") {
      if (!categoryCode || !destinationSlug) {
        setStepError("Select a category.");
        return;
      }
      setPackages([]);
      setSelectedPkgId(null);
      await loadPackages(destinationSlug, categoryCode);
      setPickStep(3);
      return;
    }

    if (id === "package") {
      if (!selectedPkgId) {
        setStepError("Select a package to update.");
        return;
      }
      await loadPackageDetail(selectedPkgId);
    }
  };

  const pickBack = () => {
    setStepError(null);
    if (pickStep === 0) return;
    setPickStep((s) => s - 1);
  };

  const patchDestination = (patch: Partial<HolidayPackageFormState["destination"]>) => {
    setForm((f) => (f ? { ...f, destination: { ...f.destination, ...patch } } : f));
  };

  const patchPackage = (
    patch: Partial<Omit<HolidayPackageFormState["tourPackage"], "pricing">> & {
      pricing?: Partial<HolidayPackageFormState["tourPackage"]["pricing"]>;
    }
  ) => {
    setForm((f) => {
      if (!f) return f;
      const nextPackage = {
        ...f.tourPackage,
        ...patch,
        pricing: patch.pricing
          ? { ...f.tourPackage.pricing, ...patch.pricing }
          : f.tourPackage.pricing,
      };
      if (patch.days !== undefined) {
        nextPackage.itinerary = syncItineraryToPackageDays(
          f.tourPackage.itinerary,
          patch.days
        );
      }
      return { ...f, tourPackage: nextPackage };
    });
  };

  const itineraryStepIndex = React.useMemo(
    () => WIZARD_STEPS.findIndex((s) => s.id === "itinerary"),
    []
  );

  React.useEffect(() => {
    if (phase !== "edit" || !form || editStep !== itineraryStepIndex) return;
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        tourPackage: {
          ...f.tourPackage,
          itinerary: syncItineraryToPackageDays(
            f.tourPackage.itinerary,
            f.tourPackage.days
          ),
        },
      };
    });
  }, [phase, editStep, itineraryStepIndex]);

  const editGoNext = () => {
    if (!form) return;
    const err = validateHolidayPackageStep(editCurrent.id, form);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setEditStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const editGoBack = () => {
    setStepError(null);
    setEditStep((s) => Math.max(s - 1, 0));
  };

  const submitUpdate = async () => {
    if (!form || !selectedPkgId) return;
    const err = validateHolidayPackageStep("review", form);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setSubmitting(true);
    setSubmitOutcome(null);
    try {
      const { data, status } = await http.put<UpdateApiOk>(
        `/api/supervision/holidays/packages/${encodeURIComponent(selectedPkgId)}`,
        form
      );
      const message =
        (data.data as { message?: string })?.message || "Holiday package updated successfully";
      setSubmitOutcome({ ok: true, message, status, response: data });
      toast.success(message);
    } catch (e) {
      const ax = e as AxiosError<{ message?: string; data?: unknown }>;
      const message = getApiErrorMessage(e);
      setSubmitOutcome({
        ok: false,
        message,
        status: ax.response?.status,
        response: ax.response?.data ?? { message: ax.message },
      });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitOutcome) {
    return (
      <Card className={cn(!submitOutcome.ok && "border-red-200 dark:border-red-900")}>
        <CardHeader>
          <CardTitle>
            {submitOutcome.ok ? "Package updated" : "Update package failed"}
          </CardTitle>
          {submitOutcome.status ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              HTTP {submitOutcome.status}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p
            className={cn(
              submitOutcome.ok
                ? "text-zinc-600 dark:text-zinc-400"
                : "text-red-700 dark:text-red-300"
            )}
          >
            {submitOutcome.message}
          </p>
          <pre
            className={cn(
              "max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-3 text-xs",
              submitOutcome.ok
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
            )}
          >
            {JSON.stringify(submitOutcome.response, null, 2)}
          </pre>
          <div className="flex flex-wrap gap-2">
            {submitOutcome.ok ? (
              <Button type="button" onClick={resetAll}>
                Update another package
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitOutcome(null)}
                >
                  Back to review &amp; edit
                </Button>
                <Button type="button" onClick={resetAll}>
                  Start over
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "pick") {
    const isFirst = pickStep === 0;
    const isLast = pickStep === PICK_STEPS.length - 1;

    return (
      <div className="space-y-6">
        <nav className="flex flex-wrap gap-2">
          {PICK_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                i === pickStep
                  ? "bg-primary text-white"
                  : i < pickStep
                    ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900"
              )}
            >
              {i + 1}. {s.title}
            </span>
          ))}
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>{pickCurrent.title}</CardTitle>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Step {pickStep + 1} of {PICK_STEPS.length} — find the package to update
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {stepError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {stepError}
              </p>
            ) : null}

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}

            {!loading && pickCurrent.id === "region" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["international", "International"],
                    ["india", "India"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRegion(value)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm font-medium",
                      region === value
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {!loading && pickCurrent.id === "destination" ? (
              <div className="space-y-4">
                <Link
                  href={`/supervision/holidays/create-package?region=${encodeURIComponent(region ?? "international")}`}
                  className={cn(
                    "block rounded-lg border border-dashed px-4 py-3 transition-colors",
                    "border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10"
                  )}
                >
                  <span className="block text-sm font-medium text-primary">
                    Add new destination
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                    Open create package to set up a new destination and tour package
                  </span>
                </Link>
                {activeDestinations.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Active destinations
                    </h3>
                    <SelectionList
                      tone="active"
                      items={activeDestinations.map((d) => ({ ...d, key: d.slug }))}
                      selectedKey={destinationSlug}
                      onSelect={setDestinationSlug}
                      renderLabel={(d) => d.name}
                      renderMeta={renderDestinationMeta}
                    />
                  </section>
                ) : null}
                {inactiveDestinations.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Inactive destinations
                    </h3>
                    <SelectionList
                      tone="inactive"
                      items={inactiveDestinations.map((d) => ({ ...d, key: d.slug }))}
                      selectedKey={destinationSlug}
                      onSelect={setDestinationSlug}
                      renderLabel={(d) => d.name}
                      renderMeta={renderDestinationMeta}
                    />
                  </section>
                ) : null}
                {destinations.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No destinations returned from API.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!loading && pickCurrent.id === "category" ? (
              <SelectionList
                items={categories.map((c) => ({ ...c, key: c.code }))}
                selectedKey={categoryCode}
                onSelect={setCategoryCode}
                renderLabel={(c) => c.label}
                renderMeta={(c) => c.code}
              />
            ) : null}

            {!loading && pickCurrent.id === "package" ? (
              <div className="space-y-4">
                {activePackages.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Active packages
                    </h3>
                    <SelectionList
                      tone="active"
                      items={activePackages.map((p) => ({ ...p, key: p.pkgId }))}
                      selectedKey={selectedPkgId}
                      onSelect={setSelectedPkgId}
                      renderLabel={(p) => p.title ?? p.pkgId}
                      renderMeta={renderPackageMeta}
                    />
                  </section>
                ) : null}
                {inactivePackages.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Inactive packages
                    </h3>
                    <SelectionList
                      tone="inactive"
                      items={inactivePackages.map((p) => ({ ...p, key: p.pkgId }))}
                      selectedKey={selectedPkgId}
                      onSelect={setSelectedPkgId}
                      renderLabel={(p) => p.title ?? p.pkgId}
                      renderMeta={renderPackageMeta}
                    />
                  </section>
                ) : null}
                {packages.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No packages found for this destination and category.
                  </p>
                ) : null}
              </div>
            ) : null}

            {pickStep > 0 && selectedDestination ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Destination: {selectedDestination.name} ({selectedDestination.slug})
                {selectedCategory ? ` · Category: ${selectedCategory.label}` : ""}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <Button type="button" variant="outline" disabled={isFirst} onClick={pickBack}>
                Back
              </Button>
              <div className="flex flex-wrap gap-2">
                {pickCurrent.id === "package" && createPackagePrefillHref ? (
                  <Button type="button" variant="outline" asChild>
                    <Link href={createPackagePrefillHref}>Create new package</Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={
                    loading ||
                    (isLast && packages.length === 0 && pickCurrent.id === "package")
                  }
                  onClick={() => void pickNext()}
                >
                  {loading
                    ? "Loading…"
                    : isLast
                      ? "Load package & edit"
                      : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Package form not loaded.{" "}
        <button type="button" className="underline" onClick={resetAll}>
          Start over
        </button>
      </p>
    );
  }

  const isEditFirst = editStep === 0;
  const isEditLast = editStep === WIZARD_STEPS.length - 1;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p>
          <span className="font-medium">Updating:</span> {form.tourPackage.title} (
          {form.tourPackage.pkgId})
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {selectedDestination?.name ?? form.destination.name} ·{" "}
          {selectedCategory?.label ?? form.tourPackage.categoryCode}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={resetAll}
        >
          Choose a different package
        </Button>
      </div>

      <nav className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            disabled={i > editStep}
            onClick={() => i <= editStep && setEditStep(i)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              i === editStep
                ? "bg-primary text-white"
                : i < editStep
                  ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900"
            )}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{editCurrent.title}</CardTitle>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Step {editStep + 1} of {WIZARD_STEPS.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {stepError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {stepError}
            </p>
          ) : null}

          <HolidayPackageWizardStepContent
            stepId={editCurrent.id}
            form={form}
            patchDestination={patchDestination}
            patchPackage={patchPackage}
            locks={{ pkgId: true }}
          />

          <div className="flex justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              disabled={isEditFirst}
              onClick={editGoBack}
            >
              Back
            </Button>
            {isEditLast ? (
              <Button type="button" disabled={submitting} onClick={() => void submitUpdate()}>
                {submitting ? "Updating…" : "Update package"}
              </Button>
            ) : (
              <Button type="button" onClick={editGoNext}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
