"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export type EditableStatusCellProps = {
  status: string | null;
  isEditing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => void;
};

const inputClassName =
  "w-full min-w-[10rem] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

export function EditableStatusCell({
  status,
  isEditing,
  saving,
  onStartEdit,
  onCancel,
  onSave,
}: EditableStatusCellProps) {
  const saved = status ?? "";
  const [draft, setDraft] = React.useState(saved);

  React.useEffect(() => {
    if (isEditing) {
      setDraft(saved);
    }
  }, [isEditing, saved]);

  if (isEditing) {
    return (
      <div className="min-w-[12rem] space-y-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClassName}
          placeholder="Status value"
          disabled={saving}
          autoFocus
        />
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
      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        {saved.trim() ? saved : "—"}
      </span>
      <div>
        <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
          Change
        </Button>
      </div>
    </div>
  );
}
