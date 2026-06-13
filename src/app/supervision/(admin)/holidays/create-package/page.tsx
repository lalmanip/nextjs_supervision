import CreateHolidayPackageWizard from "./widgets/create-holiday-package-wizard";

export default function CreateHolidayPackagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create holiday package</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Enter destination and package details step by step, then submit to the holidays API.
        </p>
      </div>
      <CreateHolidayPackageWizard />
    </div>
  );
}
