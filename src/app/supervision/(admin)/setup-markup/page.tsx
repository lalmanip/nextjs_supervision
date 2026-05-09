import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SetupMarkupForm from "./widgets/setup-markup-form";

export default function SetupMarkupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup Markup</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Configure markups per channel (B2B/B2C/Corporate) and supplier.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Markup Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <SetupMarkupForm />
        </CardContent>
      </Card>
    </div>
  );
}

