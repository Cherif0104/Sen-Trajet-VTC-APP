import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { saveVehicle } from "@/server/actions/admin-fleet";
import { COMMERCIAL_STATUSES, FUELS, PUBLICATION_STATUSES, TECHNICAL_STATUSES, TRANSMISSIONS, WITH_DRIVER } from "@/lib/domain";
import type { schema } from "@/server/db";

type Vehicle = typeof schema.vehicles.$inferSelect;
type Opt = { value: string; label: string };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-border bg-white p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {hint && <p className="-mt-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function VehicleForm({
  vehicle,
  featureIds = [],
  categories,
  features,
  owners,
}: {
  vehicle?: Vehicle;
  featureIds?: string[];
  categories: Opt[];
  features: Opt[];
  owners: Opt[];
}) {
  const v = vehicle;
  return (
    <ActionForm action={saveVehicle} className="space-y-6">
      {v && <input type="hidden" name="id" value={v.id} />}
      <Section title="Identification">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField name="brand" label="Marque" required defaultValue={v?.brand} />
          <TextField name="model" label="Modèle" required defaultValue={v?.model} />
          <TextField name="version" label="Version / finition" defaultValue={v?.version} />
          <SelectField name="categoryId" label="Catégorie" options={categories} placeholder="Sans catégorie" defaultValue={v?.categoryId ?? ""} />
          <SelectField name="ownerId" label="Propriétaire partenaire" options={owners} placeholder="Véhicule de la société" defaultValue={v?.ownerId ?? ""} />
          <TextField name="plate" label="Immatriculation (interne)" defaultValue={v?.plate} hint="Jamais affichée sur le site." />
        </div>
      </Section>

      <Section title="Caractéristiques techniques" hint="Laissez vide toute information non vérifiée : elle ne sera pas affichée.">
        <div className="grid gap-4 md:grid-cols-4">
          <TextField name="year" type="number" label="Année" defaultValue={v?.year} />
          <SelectField name="transmission" label="Boîte" options={TRANSMISSIONS} placeholder="Non renseignée" defaultValue={v?.transmission ?? ""} />
          <SelectField name="fuel" label="Carburant" options={FUELS} placeholder="Non renseigné" defaultValue={v?.fuel ?? ""} />
          <TextField name="seats" type="number" label="Places" defaultValue={v?.seats} />
          <TextField name="doors" type="number" label="Portes" defaultValue={v?.doors} />
          <TextField name="luggage" label="Bagages" defaultValue={v?.luggage} placeholder="Ex. 3 grandes valises" />
          <TextField name="color" label="Couleur" defaultValue={v?.color} />
          <TextField name="mileage" type="number" label="Kilométrage (interne)" defaultValue={v?.mileage} />
        </div>
      </Section>

      <Section title="Présentation">
        <TextField name="shortDescription" label="Accroche (cartes du catalogue)" defaultValue={v?.shortDescription} maxLength={200} />
        <TextAreaField name="description" label="Description détaillée" rows={5} defaultValue={v?.description} />
        <TextField name="usages" label="Usages recommandés" defaultValue={v?.usages} placeholder="Ex. Transferts aéroport, délégations, missions terrain" />
      </Section>

      <Section title="Équipements">
        {features.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun équipement défini. Créez-en dans « Équipements ».</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <label key={f.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-white px-3 py-2.5 text-sm has-[:checked]:border-gold has-[:checked]:bg-accent">
                <input type="checkbox" name="features" value={f.value} defaultChecked={featureIds.includes(f.value)} className="size-4 accent-[#C99A32]" />
                {f.label}
              </label>
            ))}
          </div>
        )}
        <TextAreaField name="customFeatures" label="Équipements spécifiques (un par ligne)" rows={3} defaultValue={v?.customFeatures.join("\n")} />
      </Section>

      <Section title="Tarifs" hint="Les tarifs ne sont affichés publiquement que s'ils sont marqués comme validés. Sinon, le site indique « Tarif sur devis ».">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField name="priceDay" type="number" label="Prix / jour (FCFA)" defaultValue={v?.priceDay} />
          <TextField name="priceWeek" type="number" label="Prix / semaine (FCFA)" defaultValue={v?.priceWeek} />
          <TextField name="priceMonth" type="number" label="Prix / mois (FCFA)" defaultValue={v?.priceMonth} />
        </div>
        <CheckboxField name="pricesValidated" label="Tarifs validés par la direction : les afficher sur le site" defaultChecked={v?.pricesValidated} />
      </Section>

      <Section title="Statuts">
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField name="withDriver" label="Chauffeur" options={WITH_DRIVER} defaultValue={v?.withDriver ?? "sur_demande"} />
          <SelectField name="commercialStatus" label="Statut commercial" options={COMMERCIAL_STATUSES} defaultValue={v?.commercialStatus ?? "sur_demande"} />
          <SelectField name="technicalStatus" label="Statut technique" options={TECHNICAL_STATUSES} defaultValue={v?.technicalStatus ?? "operationnel"} />
          <SelectField name="publicationStatus" label="Publication" options={PUBLICATION_STATUSES} defaultValue={v?.publicationStatus ?? "brouillon"} />
        </div>
        <CheckboxField name="featured" label="Mettre en avant sur la page d'accueil" defaultChecked={v?.featured} />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…" className="shadow-lg">
          {v ? "Enregistrer les modifications" : "Créer le véhicule"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
