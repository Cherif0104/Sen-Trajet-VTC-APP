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
  return (
    <FieldSet>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as PayMethod)} className="flex flex-col gap-2">
        {PAY_METHODS.map((method) => (
          <FieldLabel key={method.id} className="w-full items-center rounded-2xl border border-border px-3 py-3">
            <RadioGroupItem value={method.id} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span>{method.label}</span>
              <FieldDescription>
                {method.id === "wallet" ? `Solde ${fcfa(balance)}` : method.hint}
              </FieldDescription>
            </span>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  )
}
