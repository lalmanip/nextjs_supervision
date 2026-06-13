"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  applyCreatePackagePrefillFromSearchParams,
  buildPackageId,
  destinationSlugFromName,
  packageSlugFromTitle,
  syncItineraryToPackageDays,
  WIZARD_STEPS,
  type CreateHolidayPackageResponse,
  type HolidayPackageFormState,
} from "@/types/holiday-package-create";
import {
  HolidayPackageWizardStepContent,
  validateHolidayPackageStep,
} from "./holiday-package-wizard-shared";

type ApiOk = {
  status: "success";
  data: CreateHolidayPackageResponse;
};

type SubmitOutcome = {
  ok: boolean;
  message: string;
  status?: number;
  response: unknown;
};

export default function CreateHolidayPackageWizard() {
  const searchParams = useSearchParams();
  const prefill = React.useMemo(
    () => applyCreatePackagePrefillFromSearchParams(searchParams),
    [searchParams]
  );

  const buildInitialForm = React.useCallback(() => prefill.form, [prefill.form]);

  const [step, setStep] = React.useState(prefill.initialStep);
  const [form, setForm] = React.useState<HolidayPackageFormState>(buildInitialForm);
  const [packageType, setPackageType] = React.useState("");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitOutcome, setSubmitOutcome] = React.useState<SubmitOutcome | null>(null);

  const current = WIZARD_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === WIZARD_STEPS.length - 1;

  const applyGeneratedPackageId = React.useCallback(
    (state: HolidayPackageFormState, type: string): HolidayPackageFormState => {
      const trimmedType = type.trim();
      if (!trimmedType || !state.destination.name.trim()) {
        return { ...state, tourPackage: { ...state.tourPackage, pkgId: "" } };
      }
      return {
        ...state,
        tourPackage: {
          ...state.tourPackage,
          pkgId: buildPackageId({
            destinationName: state.destination.name,
            categoryCode: state.tourPackage.categoryCode,
            packageType: trimmedType,
          }),
        },
      };
    },
    []
  );

  const patchDestination = (patch: Partial<HolidayPackageFormState["destination"]>) => {
    setForm((f) => {
      const destination = { ...f.destination, ...patch };
      if (patch.name !== undefined) {
        destination.slug = destinationSlugFromName(patch.name);
      }
      return applyGeneratedPackageId({ ...f, destination }, packageType);
    });
  };

  const handlePackageTypeChange = (value: string) => {
    setPackageType(value);
    setForm((f) => applyGeneratedPackageId(f, value));
  };

  const patchPackage = (
    patch: Partial<Omit<HolidayPackageFormState["tourPackage"], "pricing">> & {
      pricing?: Partial<HolidayPackageFormState["tourPackage"]["pricing"]>;
    }
  ) => {
    setForm((f) => {
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
      if (patch.title !== undefined) {
        nextPackage.slug = packageSlugFromTitle(patch.title);
      }
      const next = { ...f, tourPackage: nextPackage };
      if (patch.categoryCode !== undefined) {
        return applyGeneratedPackageId(next, packageType);
      }
      return next;
    });
  };

  const itineraryStepIndex = React.useMemo(
    () => WIZARD_STEPS.findIndex((s) => s.id === "itinerary"),
    []
  );

  React.useEffect(() => {
    if (step !== itineraryStepIndex) return;
    setForm((f) => ({
      ...f,
      tourPackage: {
        ...f.tourPackage,
        itinerary: syncItineraryToPackageDays(
          f.tourPackage.itinerary,
          f.tourPackage.days
        ),
      },
    }));
  }, [step, itineraryStepIndex]);

  const goNext = () => {
    const err = validateHolidayPackageStep(current.id, form, { packageType });
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    const err = validateHolidayPackageStep("review", form, { packageType });
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setSubmitting(true);
    setSubmitOutcome(null);
    try {
      const trimmedPackageType = packageType.trim();
      const requestBody: HolidayPackageFormState = {
        ...form,
        destination: {
          ...form.destination,
          slug: destinationSlugFromName(form.destination.name),
        },
        tourPackage: {
          ...form.tourPackage,
          slug: packageSlugFromTitle(form.tourPackage.title),
          pkgId: trimmedPackageType
            ? buildPackageId({
                destinationName: form.destination.name,
                categoryCode: form.tourPackage.categoryCode,
                packageType: trimmedPackageType,
              })
            : form.tourPackage.pkgId,
        },
      };
      const { data, status } = await http.post<ApiOk>(
        "/api/supervision/holidays/packages",
        requestBody
      );
      const payload = data.data ?? data;
      const message =
        (payload as CreateHolidayPackageResponse)?.message ||
        "Holiday package created successfully";
      setSubmitOutcome({
        ok: true,
        message,
        status,
        response: data,
      });
      toast.success(message);
    } catch (e) {
      const ax = e as AxiosError<{ message?: string; data?: unknown; issues?: unknown }>;
      const responseBody = ax.response?.data;
      const message = getApiErrorMessage(e);
      setSubmitOutcome({
        ok: false,
        message,
        status: ax.response?.status,
        response: responseBody ?? { message: ax.message },
      });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPackageType("");
    setForm(buildInitialForm());
    setStep(prefill.initialStep);
    setSubmitOutcome(null);
    setStepError(null);
  };

  const dismissOutcome = () => {
    setSubmitOutcome(null);
    setStepError(null);
  };

  if (submitOutcome) {
    const successData = submitOutcome.ok
      ? ((submitOutcome.response as ApiOk)?.data ?? submitOutcome.response)
      : null;
    const result =
      successData && typeof successData === "object"
        ? (successData as CreateHolidayPackageResponse)
        : null;

    return (
      <Card className={cn(!submitOutcome.ok && "border-red-200 dark:border-red-900")}>
        <CardHeader>
          <CardTitle>
            {submitOutcome.ok ? "Package created" : "Create package failed"}
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

          {submitOutcome.ok && result ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="font-medium">Destination</dt>
                <dd>
                  {result.destinationName} ({result.destinationSlug})
                </dd>
              </div>
              <div>
                <dt className="font-medium">Package</dt>
                <dd>{result.pkgId}</dd>
              </div>
              {result.detailUrl ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium">Detail URL</dt>
                  <dd className="break-all">{result.detailUrl}</dd>
                </div>
              ) : null}
              {result.listingUrl ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium">Listing URL</dt>
                  <dd className="break-all">{result.listingUrl}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="space-y-2">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">Backend response</p>
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
          </div>

          <div className="flex flex-wrap gap-2">
            {submitOutcome.ok ? (
              <Button type="button" onClick={resetForm}>
                Create another package
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={dismissOutcome}>
                  Back to review &amp; edit
                </Button>
                <Button type="button" onClick={resetForm}>
                  Start over
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            disabled={i > step}
            onClick={() => i <= step && setStep(i)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              i === step
                ? "bg-primary text-white"
                : i < step
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
          <CardTitle>{current.title}</CardTitle>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Step {step + 1} of {WIZARD_STEPS.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {stepError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {stepError}
            </p>
          ) : null}

          <HolidayPackageWizardStepContent
            stepId={current.id}
            form={form}
            patchDestination={patchDestination}
            patchPackage={patchPackage}
            packageType={packageType}
            onPackageTypeChange={handlePackageTypeChange}
          />

          <div className="flex justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button type="button" variant="outline" disabled={isFirst} onClick={goBack}>
              Back
            </Button>
            {isLast ? (
              <Button type="button" disabled={submitting} onClick={() => void submit()}>
                {submitting ? "Creating…" : "Create package"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
