"use client";

import { useActionState } from "react";
import { FileInput } from "@/components/file-input";
import { FormMessage, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { createSubmission } from "@/server/actions/owner";
import { initialState } from "@/lib/action-state";
import { FUELS, TRANSMISSIONS } from "@/lib/domain";

export function SubmissionForm() {
  const [state, action] = useActionState(createSubmission, initialState);
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Marque" name="brand" required placeholder="Ex. Toyota" state={state} />
        <TextField label="Modèle" name="model" required placeholder="Ex. Land Cruiser Prado" state={state} />
        <TextField label="Année" name="year" type="number" inputMode="numeric" state={state} />
        <TextField label="Immatriculation" name="plate" state={state} />
        <TextField label="Kilométrage" name="mileage" type="number" inputMode="numeric" placeholder="En km" state={state} />
        <TextField label="Nombre de places" name="seats" type="number" inputMode="numeric" state={state} />
        <SelectField label="Carburant" name="fuel" options={FUELS} placeholder="Non précisé" state={state} />
        <SelectField label="Boîte de vitesses" name="transmission" options={TRANSMISSIONS} placeholder="Non précisée" state={state} />
      </div>
      <TextAreaField label="État du véhicule" name="condition" required placeholder="État général, entretien, éventuels défauts…" state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextAreaField label="Disponibilités" name="availability" placeholder="Ex. disponible en semaine, à partir de tel mois…" state={state} />
        <TextAreaField label="Vos conditions" name="ownerConditions" placeholder="Usage souhaité, zones, contraintes…" state={state} />
      </div>
      <FileInput name="photos" label="Photos du véhicule" accept="image/jpeg,image/png,image/webp" multiple maxFiles={8} hint="Jusqu'à 8 photos (extérieur, intérieur, compteur). Elles sont compressées automatiquement." />
      {state.errors?.photos && <p className="text-xs font-medium text-destructive">{state.errors.photos}</p>}
      <p className="rounded-lg bg-mist p-3 text-xs text-muted-foreground">
        Après l&apos;envoi, vous pourrez ajouter la carte grise, l&apos;attestation d&apos;assurance et la visite technique depuis la page du dossier.
      </p>
      <SubmitButton className="h-12 w-full px-8 sm:w-auto" pendingLabel="Envoi du dossier…">
        Soumettre mon véhicule
      </SubmitButton>
    </form>
  );
}
