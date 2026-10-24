"use client"

import { FieldDescription, FieldLabel, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PAY_METHODS, type PayMethod } from "@/lib/domain"
import { fcfa } from "@/lib/format"

export function PayPicker({
  value,
  onChange,
  balance,
}: {
  value: PayMethod
  onChange: (method: PayMethod) => void
  balance: number
}) {
  const live = PAY_METHODS.filter((method) => method.live)
  const soon = PAY_METHODS.filter((method) => !method.live)
  return (
    <FieldSet>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as PayMethod)} className="flex flex-col gap-2">
        {live.map((method) => (
          <FieldLabel key={method.id} className="w-full items-center rounded-2xl border border-border px-3 py-3">
            <RadioGroupItem value={method.id} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span>{method.label}</span>
              <FieldDescription>{method.id === "wallet" ? `Solde ${fcfa(balance)}` : method.hint}</FieldDescription>
            </span>
          </FieldLabel>
        ))}
      </RadioGroup>
      {soon.map((method) => (
        <div key={method.id} className="flex items-center justify-between rounded-2xl bg-muted px-3 py-3 text-muted-foreground">
          <span>{method.label}</span>
          <span className="text-sm">Bientôt</span>
        </div>
      ))}
    </FieldSet>
  )
}
