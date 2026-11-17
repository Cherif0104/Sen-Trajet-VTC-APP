import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { LineItemsEditor } from "@/components/app/line-items-editor";
import { saveInvoice } from "@/server/actions/admin-finance";
import type { LineItem } from "@/server/db/schema";

export function InvoiceForm({
  invoice,
  customers,
  defaults,
}: {
  invoice?: { id: string; customerId: string | null; items: LineItem[]; taxRate: number; dueAt: string | null; notes: string | null };
  customers: { value: string; label: string }[];
  defaults: { customerId?: string | null; items?: LineItem[]; taxRate: number; dueAt?: string; notes?: string; quoteId?: string; requestId?: string };
}) {
  return (
    <ActionForm action={saveInvoice} className="space-y-6">
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      {defaults.quoteId && <input type="hidden" name="quoteId" value={defaults.quoteId} />}
      {defaults.requestId && <input type="hidden" name="requestId" value={defaults.requestId} />}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField name="customerId" label="Client facturé" required options={customers} placeholder="Choisir un client" defaultValue={invoice?.customerId ?? defaults.customerId ?? ""} />
        <TextField name="dueAt" type="date" label="Date d'échéance" defaultValue={invoice?.dueAt ?? defaults.dueAt} />
      </div>
      <LineItemsEditor initial={invoice?.items ?? defaults.items ?? []} taxRate={invoice?.taxRate ?? defaults.taxRate} />
      <TextAreaField name="notes" label="Mentions et conditions de paiement" rows={3} defaultValue={invoice?.notes ?? defaults.notes ?? ""} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{invoice ? "Enregistrer le brouillon" : "Créer la facture (brouillon)"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
