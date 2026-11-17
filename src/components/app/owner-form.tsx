import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { saveOwner } from "@/server/actions/admin-crm";
import { OWNER_STATUSES } from "@/lib/domain";
import type { schema } from "@/server/db";

export function OwnerForm({ owner }: { owner?: typeof schema.owners.$inferSelect }) {
  const o = owner;
  return (
    <ActionForm action={saveOwner} className="space-y-4">
      {o && <input type="hidden" name="id" value={o.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="fullName" label="Nom complet" required defaultValue={o?.fullName} />
        <SelectField name="status" label="Statut" options={OWNER_STATUSES} defaultValue={o?.status ?? "prospect"} />
        <TextField name="email" type="email" label="E-mail" defaultValue={o?.email} />
        <TextField name="phone" type="tel" label="Téléphone" defaultValue={o?.phone} />
        <TextField name="companyName" label="Société (le cas échéant)" defaultValue={o?.companyName} />
        <TextField name="city" label="Ville" defaultValue={o?.city} />
        <TextField name="address" label="Adresse" defaultValue={o?.address} className="sm:col-span-2" />
      </div>
      <TextAreaField name="payoutDetails" label="Coordonnées de reversement (Wave, Orange Money, IBAN…)" rows={2} defaultValue={o?.payoutDetails} />
      <TextAreaField name="notes" label="Notes internes" rows={3} defaultValue={o?.notes} />
      <div className="flex justify-end">
        <SubmitButton>{o ? "Enregistrer" : "Créer le propriétaire"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
