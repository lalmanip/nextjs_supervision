"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MarkupRule = {
  id: number;
  ruleScope: string;
  productType: string;
  tripType?: string | null;
  markupType: string;
  markupValue: number;
  maxMarkupAmount?: number | null;
  priority?: number;
  channel?: string;
  description?: string;
  status?: string;
};

export default function SetupMarkupClient() {
  const [rules, setRules] = React.useState<MarkupRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [channel, setChannel] = React.useState("B2B");
  const [productType, setProductType] = React.useState("FLIGHT");
  const [tripType, setTripType] = React.useState("ALL");
  const [markupType, setMarkupType] = React.useState("PERCENT");
  const [markupValue, setMarkupValue] = React.useState("2.5");
  const [maxMarkup, setMaxMarkup] = React.useState("500");
  const [description, setDescription] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/supervision/markup/rules");
      const data = await res.json();
      if (!res.ok || data?.status === "failed") {
        throw new Error(data?.message || "Failed to load rules");
      }
      setRules(Array.isArray(data?.response) ? data.response : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load rules");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/supervision/markup/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleScope: "GLOBAL",
          productType,
          tripType,
          markupType,
          markupValue: Number(markupValue),
          maxMarkupAmount: maxMarkup.trim() ? Number(maxMarkup) : null,
          channel,
          description: description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.status === "failed") {
        throw new Error(data?.message || "Save failed");
      }
      toast.success("Global markup rule saved.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const selectCls =
    "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950";

  return (
    <div className="space-y-8">
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="channel">Channel</Label>
          <select id="channel" className={selectCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="productType">Product</Label>
          <select
            id="productType"
            className={selectCls}
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          >
            <option value="FLIGHT">Flight</option>
            <option value="HOTEL">Hotel</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tripType">Trip type</Label>
          <select id="tripType" className={selectCls} value={tripType} onChange={(e) => setTripType(e.target.value)}>
            <option value="ALL">All</option>
            <option value="DOMESTIC">Domestic</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="markupType">Markup type</Label>
          <select
            id="markupType"
            className={selectCls}
            value={markupType}
            onChange={(e) => setMarkupType(e.target.value)}
          >
            <option value="PERCENT">Percent</option>
            <option value="FLAT">Flat INR</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="markupValue">Value</Label>
          <Input
            id="markupValue"
            type="number"
            min={0}
            step="0.01"
            value={markupValue}
            onChange={(e) => setMarkupValue(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxMarkup">Max cap (optional)</Label>
          <Input id="maxMarkup" type="number" min={0} value={maxMarkup} onChange={(e) => setMaxMarkup(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save global rule"}
          </Button>
        </div>
      </form>

      <div>
        <h3 className="text-sm font-semibold mb-2">Active rules</h3>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-zinc-500">No active rules.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Markup</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.ruleScope}</td>
                    <td className="px-3 py-2">{r.channel}</td>
                    <td className="px-3 py-2">{r.productType}</td>
                    <td className="px-3 py-2">{r.tripType || "ALL"}</td>
                    <td className="px-3 py-2">
                      {r.markupType === "PERCENT"
                        ? `${r.markupValue}%`
                        : `₹${r.markupValue}`}
                    </td>
                    <td className="px-3 py-2">{r.priority ?? "—"}</td>
                    <td className="px-3 py-2">{r.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
