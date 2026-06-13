"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export type AdminNotesCellProps = {
  notes: string | null;
  isEditing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => void;
};

export function AdminNotesCell({
  notes,
  isEditing,
  saving,
  onStartEdit,
  onCancel,
  onSave,
}: AdminNotesCellProps) {
  const saved = notes ?? "";
  const [draft, setDraft] = React.useState(saved);

  React.useEffect(() => {
    if (isEditing) {
      setDraft(saved);
    }
  }, [isEditing, saved]);

  if (isEditing) {
    return (
      <div className="min-w-[18rem] space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          placeholder="Add admin notes…"
          disabled={saving}
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
    <div className="min-w-[18rem] space-y-2">
      <div className="text-sm text-zinc-900 dark:text-zinc-100">
        {saved.trim() ? (
          <span className="whitespace-pre-wrap break-words">{saved}</span>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400">—</span>
        )}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
        {saved.trim() ? "Edit" : "Add"}
      </Button>
    </div>
  );
}
