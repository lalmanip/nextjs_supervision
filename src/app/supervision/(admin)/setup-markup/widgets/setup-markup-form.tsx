"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  channel: z.enum(["B2C", "B2B", "Corporate"]),
  supplier: z.string().min(1, "Supplier is required"),
  markupPercent: z.number().min(0).max(100),
});

type Values = z.infer<typeof schema>;

export default function SetupMarkupForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { channel: "B2C", supplier: "", markupPercent: 0 },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    // Placeholder: integrate API later
    await new Promise((r) => setTimeout(r, 350));
    toast.success("Markup rule saved (sample).");
    form.reset({ ...values });
  });

  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <select
          id="channel"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
          {...form.register("channel")}
        >
          <option value="B2C">B2C</option>
          <option value="B2B">B2B</option>
          <option value="Corporate">Corporate</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input id="supplier" placeholder="e.g. Amadeus" {...form.register("supplier")} />
        {form.formState.errors.supplier?.message ? (
          <p className="text-sm text-red-600">{form.formState.errors.supplier?.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="markupPercent">Markup %</Label>
        <Input
          id="markupPercent"
          type="number"
          min={0}
          max={100}
          step={0.01}
          {...form.register("markupPercent", { valueAsNumber: true })}
        />
        {form.formState.errors.markupPercent?.message ? (
          <p className="text-sm text-red-600">{form.formState.errors.markupPercent?.message as any}</p>
        ) : null}
      </div>

      <div className="sm:col-span-3 flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

