import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { saveMission } from "@/server/actions/admin-commercial";
import { MISSION_STATUSES } from "@/lib/domain";

type Opt = { value: string; label: string };
const local = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16) : "");

export function MissionForm({
  mission,
  options,
  defaults = {},
}: {
  mission?: {
    id: string;
    requestId: string | null;
    customerId: string | null;
    vehicleId: string | null;
    driverId: string | null;
    startAt: Date | null;
    endAt: Date | null;
    pickup: string | null;
    destination: string | null;
    status: string;
    mileageStart: number | null;
    mileageEnd: number | null;
    notes: string | null;
  };
  options: { customers: Opt[]; vehicles: Opt[]; drivers: Opt[] };
  defaults?: Partial<{ requestId: string; customerId: string; vehicleId: string; startAt: string; endAt: string; pickup: string; destination: string; notes: string }>;
}) {
  return (
    <ActionForm action={saveMission} className="space-y-5">
      {mission && <input type="hidden" name="id" value={mission.id} />}
      <input type="hidden" name="requestId" value={mission?.requestId ?? defaults.requestId ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField name="customerId" label="Client" options={options.customers} placeholder="Aucun client lié" defaultValue={mission?.customerId ?? defaults.customerId ?? ""} />
        <SelectField name="status" label="Statut" options={MISSION_STATUSES} defaultValue={mission?.status ?? "planifiee"} />
        <TextField name="startAt" type="datetime-local" label="Début (heure de Dakar)" required defaultValue={local(mission?.startAt) || defaults.startAt} />
        <TextField name="endAt" type="datetime-local" label="Fin prévue" defaultValue={local(mission?.endAt) || defaults.endAt} />
        <SelectField name="vehicleId" label="Véhicule" options={options.vehicles} placeholder="À affecter" defaultValue={mission?.vehicleId ?? defaults.vehicleId ?? ""} />
        <SelectField name="driverId" label="Chauffeur" options={options.drivers} placeholder="À affecter" defaultValue={mission?.driverId ?? ""} />
        <TextField name="pickup" label="Prise en charge" defaultValue={mission?.pickup ?? defaults.pickup} />
        <TextField name="destination" label="Destination" defaultValue={mission?.destination ?? defaults.destination} />
        {mission && (
          <>
            <TextField name="mileageStart" type="number" inputMode="numeric" label="Kilométrage au départ" defaultValue={mission.mileageStart} />
            <TextField name="mileageEnd" type="number" inputMode="numeric" label="Kilométrage à l'arrivée" defaultValue={mission.mileageEnd} />
          </>
        )}
      </div>
      <TextAreaField name="notes" label="Consignes pour le chauffeur" rows={3} defaultValue={mission?.notes ?? defaults.notes} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{mission ? "Enregistrer" : "Planifier la mission"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
