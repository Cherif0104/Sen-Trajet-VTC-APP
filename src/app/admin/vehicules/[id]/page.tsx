import Image from "next/image";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ExternalLink, Star } from "lucide-react";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { VehicleForm } from "@/components/app/vehicle-form";
import { FileInput } from "@/components/file-input";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { ownerOptions } from "@/server/queries/admin";
import { archiveVehicle, deleteVehicleImage, setVehicleCover, uploadVehicleImages } from "@/server/actions/admin-fleet";
import { MAINTENANCE_STATUSES, maintenanceTypeLabel, MISSION_STATUSES, PUBLICATION_STATUSES } from "@/lib/domain";
import { fdate, fdatetime } from "@/lib/format";

export default async function VehicleDetail({ params }: PageProps<"/admin/vehicules/[id]">) {
  await requirePermission("vehicles.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [v] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id)).limit(1);
  if (!v) notFound();
  const [categories, features, owners, vf, images, maint, missions] = await Promise.all([
    db.select({ value: schema.categories.id, label: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    db.select({ value: schema.features.id, label: schema.features.name }).from(schema.features).orderBy(asc(schema.features.sortOrder)),
    ownerOptions(),
    db.select({ id: schema.vehicleFeatures.featureId }).from(schema.vehicleFeatures).where(eq(schema.vehicleFeatures.vehicleId, id)),
    db.select().from(schema.vehicleImages).where(eq(schema.vehicleImages.vehicleId, id)).orderBy(asc(schema.vehicleImages.sortOrder)),
    db.select().from(schema.maintenance).where(eq(schema.maintenance.vehicleId, id)).orderBy(desc(schema.maintenance.scheduledDate)).limit(10),
    db.select().from(schema.missions).where(eq(schema.missions.vehicleId, id)).orderBy(desc(schema.missions.startAt)).limit(10),
  ]);
  const gallery = [...(v.coverImage && !images.some((i) => i.url === v.coverImage) ? [{ id: "cover", url: v.coverImage, alt: null }] : []), ...images];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/vehicules", label: "Véhicules" }}
        title={`${v.brand} ${v.model}${v.version ? ` ${v.version}` : ""}`}
        description={<StatusBadge list={PUBLICATION_STATUSES} value={v.publicationStatus} />}
        actions={
          <>
            {v.publicationStatus === "publie" && (
              <ButtonLink href={`/vehicules/${v.slug}`} variant="outline" target="_blank">
                <ExternalLink className="size-4" /> Voir sur le site
              </ButtonLink>
            )}
            {v.publicationStatus !== "archive" && (
              <ConfirmActionButton action={archiveVehicle} fields={{ id: v.id }} confirm="Archiver ce véhicule ? Il sera retiré du site, l'historique est conservé." variant="ghost">
                Archiver
              </ConfirmActionButton>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <VehicleForm vehicle={v} featureIds={vf.map((x) => x.id)} categories={categories} features={features} owners={owners} />
        <div className="space-y-6">
          <Card title="Photos">
            {gallery.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">Aucune photo. Le site affichera un visuel neutre.</p>
            ) : (
              <ul className="mb-4 grid grid-cols-2 gap-3">
                {gallery.map((img) => (
                  <li key={img.id} className="space-y-1.5">
                    <div className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-mist ${v.coverImage === img.url ? "ring-2 ring-gold" : ""}`}>
                      <Image src={img.url} alt={img.alt ?? ""} fill sizes="200px" className="object-cover" unoptimized={img.url.startsWith("/api/")} />
                      {v.coverImage === img.url && (
                        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-[0.65rem] text-gold-light">
                          <Star className="size-3" /> Principale
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {v.coverImage !== img.url && (
                        <ConfirmActionButton action={setVehicleCover} fields={{ vehicleId: v.id, url: img.url }} size="xs" variant="outline">
                          Principale
                        </ConfirmActionButton>
                      )}
                      {img.id !== "cover" && (
                        <ConfirmActionButton action={deleteVehicleImage} fields={{ imageId: img.id }} confirm="Supprimer cette photo ?" size="xs" variant="ghost" className="text-destructive">
                          Supprimer
                        </ConfirmActionButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={uploadVehicleImages} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="vehicleId" value={v.id} />
              <FileInput name="images" label="Ajouter des photos" accept="image/jpeg,image/png,image/webp" multiple hint="JPG, PNG ou WebP. Les photos sont optimisées automatiquement." />
              <SubmitButton variant="outline" className="w-full" pendingLabel="Envoi…">
                Téléverser
              </SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Maintenance" actions={<a href={`/admin/maintenance?vehicule=${v.id}`} className="text-sm text-gold hover:underline">Gérer</a>}>
            {maint.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {maint.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span>
                      {maintenanceTypeLabel(m.type)} <span className="text-xs text-muted-foreground">· {fdate(m.completedDate ?? m.scheduledDate)}</span>
                    </span>
                    <StatusBadge list={MAINTENANCE_STATUSES} value={m.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Dernières missions">
            {missions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune mission.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {missions.map((m) => (
                  <li key={m.id}>
                    <a href={`/admin/missions/${m.id}`} className="flex items-center justify-between gap-2 hover:text-gold">
                      <span>{fdatetime(m.startAt)}</span>
                      <StatusBadge list={MISSION_STATUSES} value={m.status} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
