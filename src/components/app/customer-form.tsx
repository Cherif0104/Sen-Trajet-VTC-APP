import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { saveCustomer } from "@/server/actions/admin-crm";
import { ACCOUNT_TYPES } from "@/lib/domain";
import type { schema } from "@/server/db";

export function CustomerForm({ customer }: { customer?: typeof schema.customers.$inferSelect }) {
  const c = customer;
  return (
    <ActionForm action={saveCustomer} className="space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="type" label="Type de client" options={ACCOUNT_TYPES} defaultValue={c?.type ?? "particulier"} />
        <TextField name="companyName" label="Structure (entreprise, ONG, institution)" defaultValue={c?.companyName} />
        <TextField name="fullName" label="Nom du contact" required defaultValue={c?.fullName} />
        <TextField name="email" type="email" label="E-mail" defaultValue={c?.email} />
        <TextField name="phone" type="tel" label="Téléphone" defaultValue={c?.phone} />
        <TextField name="city" label="Ville" defaultValue={c?.city} />
        <TextField name="address" label="Adresse" defaultValue={c?.address} className="sm:col-span-2" />
      </div>
      <TextAreaField name="notes" label="Notes internes" rows={3} defaultValue={c?.notes} />
      <div className="flex justify-end">
        <SubmitButton>{c ? "Enregistrer" : "Créer le client"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
