import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { saveDriver } from "@/server/actions/admin-fleet";
import { DRIVER_STATUSES } from "@/lib/domain";
import type { schema } from "@/server/db";

export function DriverForm({ driver }: { driver?: typeof schema.drivers.$inferSelect }) {
  const d = driver;
  return (
    <ActionForm action={saveDriver} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="fullName" label="Nom complet" required defaultValue={d?.fullName} />
        <SelectField name="status" label="Statut" options={DRIVER_STATUSES} defaultValue={d?.status ?? "actif"} />
        <TextField name="phone" type="tel" label="Téléphone" defaultValue={d?.phone} />
        <TextField name="email" type="email" label="E-mail (lien avec son compte chauffeur)" defaultValue={d?.email} />
        <TextField name="licenseNumber" label="N° de permis" defaultValue={d?.licenseNumber} />
        <TextField name="licenseExpiry" type="date" label="Expiration du permis" defaultValue={d?.licenseExpiry} />
        <TextField name="languages" label="Langues parlées" defaultValue={d?.languages} placeholder="Français, wolof, anglais" className="sm:col-span-2" />
      </div>
      <TextAreaField name="notes" label="Notes internes" rows={3} defaultValue={d?.notes} />
      <div className="flex justify-end">
        <SubmitButton>{d ? "Enregistrer" : "Créer la fiche"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
