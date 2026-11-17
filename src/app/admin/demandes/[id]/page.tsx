import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField } from "@/components/forms";
import { Card, KeyValues, PageHeader, StatusBadge, Timeline } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions, staffOptions } from "@/server/queries/admin";
import { attachRequestToCustomer, changeRequestStatus, updateRequestInternal } from "@/server/actions/admin-commercial";
import { accountTypeLabel, INVOICE_STATUSES, MISSION_STATUSES, QUOTE_STATUSES, REQUEST_STATUSES, requestStatusLabel, serviceLabel } from "@/lib/domain";
import { fcfa, fdate, fdatetime, telLink, waLink } from "@/lib/format";
import { can } from "@/lib/permissions";

export default async function AdminRequestDetail({ params }: PageProps<"/admin/demandes/[id]">) {
  const user = await requirePermission("requests.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [r] = await db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1);
  if (!r) notFound();

  const [history, quotes, missions, invoices, staff, customers, vehicle, category, customer] = await Promise.all([
    db
      .select({ h: schema.requestHistory, by: schema.users.fullName })
      .from(schema.requestHistory)
      .leftJoin(schema.users, eq(schema.users.id, schema.requestHistory.byUserId))
      .where(eq(schema.requestHistory.requestId, id))
      .orderBy(desc(schema.requestHistory.createdAt)),
    db.select().from(schema.quotes).where(eq(schema.quotes.requestId, id)).orderBy(asc(schema.quotes.createdAt)),
    db.select().from(schema.missions).where(eq(schema.missions.requestId, id)).orderBy(asc(schema.missions.startAt)),
    db.select().from(schema.invoices).where(eq(schema.invoices.requestId, id)).orderBy(asc(schema.invoices.createdAt)),
    staffOptions(),
    customerOptions(),
    r.vehicleId ? db.select().from(schema.vehicles).where(eq(schema.vehicles.id, r.vehicleId)).then((x) => x[0]) : undefined,
    r.categoryId ? db.select().from(schema.categories).where(eq(schema.categories.id, r.categoryId)).then((x) => x[0]) : undefined,
    r.customerId ? db.select().from(schema.customers).where(eq(schema.customers.id, r.customerId)).then((x) => x[0]) : undefined,
  ]);

  const waText = `Bonjour ${r.contactName}, SENTRAJET PREMIUM vous contacte au sujet de votre demande ${r.reference}.`;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/demandes", label: "Demandes" }}
        title={`${r.kind === "reservation" ? "Réservation" : "Demande de devis"} ${r.reference}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge list={REQUEST_STATUSES} value={r.status} /> Reçue le {fdatetime(r.createdAt)}
          </span>
        }
        actions={
          <>
            {can(user.role, "quotes.manage") && <ButtonLink href={`/admin/devis/nouveau?demande=${r.id}`}>Créer un devis</ButtonLink>}
            {can(user.role, "missions.manage") && (
              <ButtonLink href={`/admin/missions/nouvelle?demande=${r.id}`} variant="outline">
                Planifier une mission
              </ButtonLink>
            )}
            {can(user.role, "invoices.manage") && (
              <ButtonLink href={`/admin/factures/nouvelle?demande=${r.id}`} variant="outline">
                Facturer
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Prestation demandée">
            <KeyValues
              items={[
                ["Prestation", serviceLabel(r.serviceType)],
                ["Catégorie souhaitée", category?.name],
                ["Véhicule souhaité", vehicle ? `${vehicle.brand} ${vehicle.model}` : "Aucun en particulier"],
                ["Avec chauffeur", r.withDriver ? "Oui" : "Non"],
                ["Début", r.startDate ? `${fdate(r.startDate)}${r.startTime ? ` à ${r.startTime}` : ""}` : null],
                ["Fin", r.endDate ? `${fdate(r.endDate)}${r.endTime ? ` à ${r.endTime}` : ""}` : null],
                ["Durée", r.duration],
                ["Passagers", r.passengers],
                ["Lieu de prise en charge", r.pickup],
                ["Destination", r.destination],
              ]}
            />
            {r.details && <p className="mt-4 rounded-lg bg-mist p-4 text-sm whitespace-pre-line">{r.details}</p>}
          </Card>

          <Card title="Contact">
            <KeyValues
              items={[
                ["Nom", r.contactName],
                ["Type de compte", accountTypeLabel(r.accountType)],
                ["Structure", r.companyName],
                ["Fonction", r.companyRole],
                ["E-mail", <a key="m" href={`mailto:${r.email}`} className="text-gold hover:underline">{r.email}</a>],
                [
                  "Téléphone",
                  <span key="p" className="flex flex-wrap gap-3">
                    <a href={telLink(r.phone)} className="text-gold hover:underline">{r.phone}</a>
                    <a href={waLink(r.phone, waText)} target="_blank" rel="noreferrer" className="text-gold hover:underline">WhatsApp</a>
                  </span>,
                ],
                ["Facturation", r.billingInfo],
                ["Fiche client", customer ? <a key="c" href={`/admin/clients/${customer.id}`} className="text-gold hover:underline">{customer.companyName ?? customer.fullName}</a> : "Non rattachée"],
                ["Compte client", r.userId ? "Oui, suivi dans l'espace client" : "Pas de compte"],
              ]}
            />
            <ActionForm action={attachRequestToCustomer} className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
              <input type="hidden" name="id" value={r.id} />
              <div className="flex-1">
                <SelectField name="customerId" label="Rattacher à une autre fiche client" options={customers} placeholder="Choisir un client" defaultValue={r.customerId ?? ""} />
              </div>
              <SubmitButton variant="outline">Rattacher</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Documents liés">
            <div className="space-y-4 text-sm">
              <LinkedList
                title="Devis"
                empty="Aucun devis."
                items={quotes.map((q) => ({ id: q.id, href: `/admin/devis/${q.id}`, label: q.number, meta: fcfa(q.total), badge: <StatusBadge list={QUOTE_STATUSES} value={q.status} /> }))}
              />
              <LinkedList
                title="Missions"
                empty="Aucune mission."
                items={missions.map((m) => ({ id: m.id, href: `/admin/missions/${m.id}`, label: m.reference, meta: fdatetime(m.startAt), badge: <StatusBadge list={MISSION_STATUSES} value={m.status} /> }))}
              />
              <LinkedList
                title="Factures"
                empty="Aucune facture."
                items={invoices.map((i) => ({ id: i.id, href: `/admin/factures/${i.id}`, label: i.number, meta: fcfa(i.total), badge: <StatusBadge list={INVOICE_STATUSES} value={i.status} /> }))}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Faire évoluer le statut">
            <ActionForm action={changeRequestStatus} className="space-y-4" resetOnSuccess>
              <input type="hidden" name="id" value={r.id} />
              <SelectField name="status" label="Nouveau statut" options={REQUEST_STATUSES} defaultValue={r.status} />
              <TextAreaField name="note" label="Note (visible par le client si vous le notifiez)" rows={3} />
              <CheckboxField name="notifyClient" label="Informer le client par e-mail et dans son espace" />
              <SubmitButton className="w-full">Enregistrer</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Suivi interne">
            <ActionForm action={updateRequestInternal} className="space-y-4">
              <input type="hidden" name="id" value={r.id} />
              <SelectField name="assignedTo" label="Responsable" options={staff} placeholder="Non assignée" defaultValue={r.assignedTo ?? ""} />
              <TextAreaField name="internalNotes" label="Notes internes (jamais visibles par le client)" rows={4} defaultValue={r.internalNotes ?? ""} />
              <SubmitButton variant="outline" className="w-full">
                Enregistrer
              </SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Historique">
            <Timeline
              items={history.map(({ h, by }) => ({
                id: h.id,
                title: h.fromStatus && h.fromStatus !== h.toStatus ? `${requestStatusLabel(h.fromStatus)} → ${requestStatusLabel(h.toStatus)}` : requestStatusLabel(h.toStatus),
                meta: `${fdatetime(h.createdAt)}${by ? ` · ${by}` : " · Client"}`,
                note: h.note,
              }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function LinkedList({ title, empty, items }: { title: string; empty: string; items: { id: string; href: string; label: string; meta: string; badge: React.ReactNode }[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((i) => (
            <li key={i.id}>
              <a href={i.href} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-mist">
                <span className="whitespace-nowrap font-mono text-xs">{i.label}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {i.meta} {i.badge}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
