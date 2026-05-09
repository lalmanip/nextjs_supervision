import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupCommissionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup Commission</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Configure commission slabs and rules for agencies and corporates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          This module will use a DataTable for rules + a modal editor with validation.
        </CardContent>
      </Card>
    </div>
  );
}

