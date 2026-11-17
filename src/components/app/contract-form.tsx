import { FileInput } from "@/components/file-input";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { saveContract } from "@/server/actions/admin-finance";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "@/lib/domain";
import type { schema } from "@/server/db";

type Opt = { value: string; label: string };

export function ContractForm({
  contract,
  options,
  defaults = {},
}: {
  contract?: typeof schema.contracts.$inferSelect;
  options: { customers: Opt[]; owners: Opt[]; vehicles: Opt[] };
  defaults?: { type?: string; ownerId?: string; customerId?: string };
}) {
  const c = contract;
  return (
    <ActionForm action={saveContract} className="space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="type" label="Type de contrat" options={CONTRACT_TYPES} defaultValue={c?.type ?? defaults.type ?? "client"} />
        <SelectField name="status" label="Statut" options={CONTRACT_STATUSES} defaultValue={c?.status ?? "brouillon"} />
        <TextField name="title" label="Intitulé" required defaultValue={c?.title} placeholder="Ex. Contrat de mise à disposition — Toyota Hiace" className="sm:col-span-2" />
        <SelectField name="customerId" label="Client (contrat client ou corporate)" options={options.customers} placeholder="—" defaultValue={c?.customerId ?? defaults.customerId ?? ""} />
        <SelectField name="ownerId" label="Propriétaire (partenariat)" options={options.owners} placeholder="—" defaultValue={c?.ownerId ?? defaults.ownerId ?? ""} />
        <SelectField name="vehicleId" label="Véhicule concerné" options={options.vehicles} placeholder="—" defaultValue={c?.vehicleId ?? ""} />
        <TextField name="amount" type="number" label="Montant de référence (FCFA)" defaultValue={c?.amount} />
        <TextField name="startDate" type="date" label="Début" defaultValue={c?.startDate} />
        <TextField name="endDate" type="date" label="Fin" defaultValue={c?.endDate} />
      </div>
      <TextAreaField name="terms" label="Conditions principales (résumé interne)" rows={4} defaultValue={c?.terms} />
      <FileInput name="file" label={c?.fileId ? "Remplacer le document signé" : "Document du contrat (PDF ou scan)"} hint="PDF, JPG ou PNG, 3,5 Mo maximum." />
      <CheckboxField
        name="sharedWithParty"
        label="Partager le contrat avec le propriétaire dans son espace"
        hint="Uniquement pour les partenariats propriétaires. Le propriétaire est notifié au premier partage."
        defaultChecked={c?.sharedWithParty}
      />
      <div className="flex justify-end">
        <SubmitButton>{c ? "Enregistrer" : "Créer le contrat"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
