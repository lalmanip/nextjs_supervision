import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPromotionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup Promotions</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create and manage promotion codes and campaign rules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          This module will support role-based approval and audit logging.
        </CardContent>
      </Card>
    </div>
  );
}

