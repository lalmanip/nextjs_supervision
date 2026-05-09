import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgencyBalancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Get Agency Balance</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Search an agency and view wallet/credit balance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          Integrate the balance API and render results in a table with filters.
        </CardContent>
      </Card>
    </div>
  );
}

