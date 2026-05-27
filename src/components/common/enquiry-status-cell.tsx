"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  B2C_ENQUIRY_STATUS_OPTIONS,
  formatB2cEnquiryStatusLabel,
  normalizeB2cEnquiryStatus,
  type B2cEnquiryStatus,
} from "@/types/b2c-enquiry";

export type EnquiryStatusCellProps = {
  status: string | null;
  isEditing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (status: B2cEnquiryStatus) => void;
};

const selectClassName =
  "w-full min-w-[10rem] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

function statusBadgeClass(status: string | null): string {
  const normalized = normalizeB2cEnquiryStatus(status);
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize";
  switch (normalized) {
    case "pending":
      return `${base} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`;
    case "in_progress":
      return `${base} bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200`;
    case "closed":
      return `${base} bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200`;
    default:
      return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300`;
  }
}

export function EnquiryStatusCell({
  status,
  isEditing,
  saving,
  onStartEdit,
  onCancel,
  onSave,
}: EnquiryStatusCellProps) {
  const canonical = normalizeB2cEnquiryStatus(status) ?? "pending";
  const [draft, setDraft] = React.useState<B2cEnquiryStatus>(canonical);

  React.useEffect(() => {
    if (isEditing) {
      setDraft(normalizeB2cEnquiryStatus(status) ?? "pending");
    }
  }, [isEditing, status]);

  if (isEditing) {
    return (
      <div className="min-w-[12rem] space-y-2">
        <select
          value={draft}
          onChange={(e) => setDraft(e.target.value as B2cEnquiryStatus)}
          className={selectClassName}
          disabled={saving}
        >
          {B2C_ENQUIRY_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => onSave(draft)}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[10rem] space-y-2">
      <span className={statusBadgeClass(status)}>
        {formatB2cEnquiryStatusLabel(status)}
      </span>
      <div>
        <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
          Change
        </Button>
      </div>
    </div>
  );
}
