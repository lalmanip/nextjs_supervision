"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/app/supervision/(admin)/holidays/create-package/widgets/form-controls";
import { getApiErrorMessage } from "@/services/http/client";

export type HolidayImageUploadKind = "destination-hero" | "package";

type UploadOk = {
  status: "success";
  storedPath: string;
  url: string;
};

export type HolidayImageUploadFieldProps = {
  id: string;
  label: string;
  kind: HolidayImageUploadKind;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  className?: string;
};

export function HolidayImageUploadField({
  id,
  label,
  kind,
  value,
  onChange,
  hint,
  className,
}: HolidayImageUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displaySrc = previewUrl || (value.trim() ? value.trim() : null);

  const uploadFile = async (file: File) => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("kind", kind);
      body.append("file", file, file.name);

      const res = await fetch("/api/supervision/holidays/media/upload", {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await res.json()) as UploadOk & { message?: string };
      if (!res.ok) {
        throw new Error(json.message || `Upload failed (${res.status})`);
      }
      onChange(json.url);
      toast.success("Image uploaded");
    } catch (e) {
      setPreviewUrl(null);
      toast.error(getApiErrorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={`${id}-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Attach photo"}
        </Button>
        {value.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => {
              onChange("");
              setPreviewUrl(null);
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <input
        id={id}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste an image URL"
      />

      {displaySrc ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt="Preview"
            className="max-h-48 w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
