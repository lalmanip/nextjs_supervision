import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SetupMarkupClient from "./widgets/setup-markup-client";

export default function SetupMarkupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup Markup</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Configure platform-wide (GLOBAL) markup rules for B2B/B2C channels. Agents manage their own
          overrides from the agent portal dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Markup rules</CardTitle>
        </CardHeader>
        <CardContent>
          <SetupMarkupClient />
        </CardContent>
      </Card>
    </div>
  );
}
