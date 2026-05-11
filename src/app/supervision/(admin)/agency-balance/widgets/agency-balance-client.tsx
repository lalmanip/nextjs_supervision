"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import type { AgencyBalanceResponse } from "@/types/agency-balance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  AgencyName: z.string().min(1, "Agency name is required"),
});

type FormValues = z.infer<typeof formSchema>;

type ApiOk = {
  status: "success";
  data: AgencyBalanceResponse;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(n);
}

export default function AgencyBalanceClient() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AgencyBalanceResponse | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { AgencyName: "TBO" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await http.post<ApiOk>("/api/supervision/agency-balance", values);
      setResult(data.data);
      toast.success("Balance loaded.");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Get Agency Balance</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Query cash and credit balance for an agency (vivapi-mt).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
          <CardDescription>
            POST body: <code className="text-xs">{"{ \"AgencyName\": \"…\" }"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={onSubmit}>
            <div className="flex-1 space-y-2">
              <Label htmlFor="AgencyName">Agency name</Label>
              <Input
                id="AgencyName"
                placeholder="TBO"
                {...form.register("AgencyName")}
              />
              {form.formState.errors.AgencyName?.message ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.AgencyName.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Loading…" : "Get balance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : null}

      {result && !loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{result.Status}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Agency type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{result.AgencyType}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Cash balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(result.CashBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Credit balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(result.CreditBalance)}
              </p>
            </CardContent>
          </Card>
          {(result.Message ?? "").trim() ? (
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.Message}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
