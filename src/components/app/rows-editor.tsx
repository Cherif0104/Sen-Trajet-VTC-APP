"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Field = { name: string; label: string; multiline?: boolean; placeholder?: string };

export function RowsEditor({ fields, initial, max = 20, addLabel }: { fields: Field[]; initial: Record<string, string>[]; max?: number; addLabel: string }) {
  const [rows, setRows] = useState<{ key: number; values: Record<string, string> }[]>(() => (initial.length ? initial : [{}]).map((values, key) => ({ key, values })));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-2 rounded-lg border border-border p-3">
          <div className={`grid flex-1 gap-2 ${fields.some((f) => f.multiline) ? "" : "sm:grid-cols-2"}`}>
            {fields.map((f) =>
              f.multiline ? (
                <Textarea key={f.name} name={f.name} defaultValue={row.values[f.name] ?? ""} aria-label={f.label} placeholder={f.placeholder ?? f.label} className="min-h-20 bg-white" />
              ) : (
                <Input key={f.name} name={f.name} defaultValue={row.values[f.name] ?? ""} aria-label={f.label} placeholder={f.placeholder ?? f.label} className="h-10 bg-white" />
              ),
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {rows.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, { key: Date.now(), values: {} }])}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}
