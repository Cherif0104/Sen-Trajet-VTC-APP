"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { useFormState } from "@/components/forms";

async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function FileInput({
  name,
  label,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  multiple,
  required,
  hint,
  maxFiles = 8,
}: {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  hint?: string;
  maxFiles?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const error = useFormState()?.errors?.[name];

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const list = Array.from(input.files ?? []).slice(0, maxFiles);
    if (!list.length) return setSummary(null);
    setBusy(true);
    const out = await Promise.all(list.map((f) => compressImage(f)));
    const dt = new DataTransfer();
    out.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    const total = out.reduce((s, f) => s + f.size, 0);
    setSummary(`${out.length} fichier${out.length > 1 ? "s" : ""} · ${(total / 1024 / 1024).toFixed(1)} Mo`);
    setBusy(false);
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-graphite">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-white px-4 py-4 text-sm hover:border-gold">
        {busy ? <Loader2 className="size-5 animate-spin text-gold" /> : <FileUp className="size-5 text-gold" />}
        <span className="flex-1 text-muted-foreground">{busy ? "Préparation des fichiers…" : (summary ?? (multiple ? "Choisir des fichiers" : "Choisir un fichier"))}</span>
        <input ref={ref} type="file" name={name} accept={accept} multiple={multiple} required={required} onChange={onChange} className="sr-only" />
      </label>
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
