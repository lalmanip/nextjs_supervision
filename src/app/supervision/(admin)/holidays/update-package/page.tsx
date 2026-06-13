import UpdateHolidayPackageWizard from "./widgets/update-holiday-package-wizard";

export default function UpdateHolidayPackagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Update holiday package</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Select region, destination, category, and package, then edit each section and
          submit changes to the holidays admin API.
        </p>
      </div>
      <UpdateHolidayPackageWizard />
    </div>
  );
}
