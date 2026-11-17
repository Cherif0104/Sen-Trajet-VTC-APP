"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormState } from "@/components/forms";

type Item = { key: number; label: string; quantity: string; unitPrice: string };
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

export function LineItemsEditor({
  initial,
  taxRate: initialTax,
  error,
  readOnly,
}: {
  initial: { label: string; quantity: number; unitPrice: number }[];
  taxRate: number;
  error?: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<Item[]>(
    (initial.length ? initial : [{ label: "", quantity: 1, unitPrice: 0 }]).map((i, k) => ({
      key: k,
      label: i.label,
      quantity: String(i.quantity),
      unitPrice: i.unitPrice ? String(i.unitPrice) : "",
    })),
  );
  const [tax, setTax] = useState(String(initialTax));
  const formState = useFormState();
  error = error ?? formState?.errors?.items ?? formState?.errors?.taxRate;
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity.replace(",", ".")) || 0) * (Number(i.unitPrice.replace(/\s/g, "")) || 0), 0);
  const taxAmount = Math.round((Math.round(subtotal) * (Number(tax) || 0)) / 100);
  const update = (key: number, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_90px_140px_120px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
        <span>Désignation</span>
        <span>Quantité</span>
        <span>Prix unitaire HT</span>
        <span className="text-right">Total HT</span>
        <span />
      </div>
      {items.map((i) => (
        <div key={i.key} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 md:grid-cols-[1fr_90px_140px_120px_40px] md:border-0 md:p-0">
          <Input
            name="item_label"
            value={i.label}
            onChange={(e) => update(i.key, { label: e.target.value })}
            placeholder="Ex. Toyota Hiace avec chauffeur — 1 journée"
            aria-label="Désignation"
            className="col-span-2 h-10 bg-white md:col-span-1"
            readOnly={readOnly}
          />
          <Input name="item_qty" value={i.quantity} onChange={(e) => update(i.key, { quantity: e.target.value })} inputMode="decimal" aria-label="Quantité" className="h-10 bg-white" readOnly={readOnly} />
          <Input name="item_price" value={i.unitPrice} onChange={(e) => update(i.key, { unitPrice: e.target.value })} inputMode="numeric" placeholder="FCFA" aria-label="Prix unitaire HT" className="h-10 bg-white" readOnly={readOnly} />
          <p className="flex h-10 items-center justify-end text-sm font-medium">{fmt((Number(i.quantity.replace(",", ".")) || 0) * (Number(i.unitPrice.replace(/\s/g, "")) || 0))}</p>
          {!readOnly && (
            <Button type="button" variant="ghost" size="icon" className="h-10" aria-label="Supprimer la ligne" onClick={() => setItems((l) => (l.length > 1 ? l.filter((x) => x.key !== i.key) : l))}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ))}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => setItems((l) => [...l, { key: Date.now(), label: "", quantity: "1", unitPrice: "" }])}>
          <Plus className="size-4" /> Ajouter une ligne
        </Button>
      )}
      <div className="ml-auto max-w-xs space-y-1.5 rounded-lg bg-mist p-4 text-sm">
        <div className="flex justify-between">
          <span>Total HT</span>
          <span className="font-medium">{fmt(subtotal)} FCFA</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="taxRate">TVA (%)</label>
          <Input id="taxRate" name="taxRate" value={tax} onChange={(e) => setTax(e.target.value)} inputMode="numeric" className="h-8 w-20 bg-white text-right" readOnly={readOnly} />
        </div>
        <div className="flex justify-between">
          <span>Montant TVA</span>
          <span className="font-medium">{fmt(taxAmount)} FCFA</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
          <span>Total TTC</span>
          <span>{fmt(Math.round(subtotal) + taxAmount)} FCFA</span>
        </div>
      </div>
    </div>
  );
}
