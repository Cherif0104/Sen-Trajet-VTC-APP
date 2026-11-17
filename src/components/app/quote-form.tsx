import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { LineItemsEditor } from "@/components/app/line-items-editor";
import { saveQuote } from "@/server/actions/admin-commercial";
import type { LineItem } from "@/server/db/schema";

export function QuoteForm({
  quote,
  requestId,
  customers,
  defaults,
}: {
  quote?: { id: string; customerId: string | null; items: LineItem[]; taxRate: number; validUntil: string | null; notes: string | null };
  requestId?: string;
  customers: { value: string; label: string }[];
  defaults: { customerId?: string | null; items?: LineItem[]; taxRate: number; validUntil: string; notes?: string };
}) {
  return (
    <ActionForm action={saveQuote} className="space-y-6">
      {quote && <input type="hidden" name="id" value={quote.id} />}
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField name="customerId" label="Client" required options={customers} placeholder="Choisir un client" defaultValue={quote?.customerId ?? defaults.customerId ?? ""} />
        <TextField name="validUntil" type="date" label="Valable jusqu'au" defaultValue={quote?.validUntil ?? defaults.validUntil} />
      </div>
      <LineItemsEditor initial={quote?.items ?? defaults.items ?? []} taxRate={quote?.taxRate ?? defaults.taxRate} />
      <TextAreaField name="notes" label="Conditions et remarques (imprimées sur le devis)" rows={3} defaultValue={quote?.notes ?? defaults.notes ?? ""} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{quote ? "Enregistrer le brouillon" : "Créer le devis"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
