import { ConfirmActionButton } from "@/components/app/confirm-action";
import { PeriodFilter } from "@/components/app/period-filter";
import { Card, PageHeader, StatCard } from "@/components/app/ui";
import { FileInput } from "@/components/file-input";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { ownerOptions, vehicleOptions } from "@/server/queries/admin";
import { financeReport, periodOf } from "@/server/queries/finance";
import { deleteExpense, recordOwnerPayout, saveExpense } from "@/server/actions/admin-finance";
import { EXPENSE_CATEGORIES, expenseCategoryLabel, PAYMENT_METHODS, paymentMethodLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Finances" };

export default async function FinancesPage({ searchParams }: PageProps<"/admin/finances">) {
  await requirePermission("finance.manage");
  const sp = await searchParams;
  const period = periodOf(sp);
  const preOwner = typeof sp.proprietaire === "string" ? sp.proprietaire : "";
  const [r, owners, vehicles] = await Promise.all([financeReport(period), ownerOptions(), vehicleOptions(true)]);
  const t = r.totals;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Finances" description="Encaissements, reversements aux propriétaires et dépenses sur la période." />
      <PeriodFilter action="/admin/finances" from={period.from} to={period.to} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Encaissements" value={fcfa(t.cashIn)} />
        <StatCard label="Reversements propriétaires" value={fcfa(t.payouts)} />
        <StatCard label="Dépenses TTC" value={fcfa(t.expTtc)} />
        <StatCard label="Solde de trésorerie" value={<span className={t.net < 0 ? "text-red-600" : ""}>{fcfa(t.net)}</span>} hint="Encaissements − reversements − dépenses" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title={`Mouvements (${r.payments.length})`}>
            {r.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun mouvement sur la période.</p>
            ) : (
              <ul className="-my-2 divide-y divide-border text-sm">
                {r.payments.map(({ p, invoice, owner }) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span>
                      <span className="font-medium">{p.direction === "encaissement" ? `Encaissement${invoice ? ` · ${invoice}` : ""}` : `Reversement · ${owner ?? "propriétaire"}`}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fdate(p.paidAt)} · {paymentMethodLabel(p.method)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                    </span>
                    <span className={`font-semibold ${p.direction === "encaissement" ? "text-emerald-700" : "text-red-600"}`}>
                      {p.direction === "encaissement" ? "+" : "−"} {fcfa(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={`Dépenses (${r.expenses.length})`}>
            {r.expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune dépense sur la période.</p>
            ) : (
              <ul className="-my-2 divide-y divide-border text-sm">
                {r.expenses.map(({ e, brand, model }) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0">
                      <span className="font-medium">{e.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fdate(e.spentAt)} · {expenseCategoryLabel(e.category)}
                        {brand ? ` · ${brand} ${model}` : ""}
                        {e.supplier ? ` · ${e.supplier}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{fcfa(e.amountTtc)}</span>
                      <ConfirmActionButton action={deleteExpense} fields={{ id: e.id }} confirm={`Supprimer la dépense « ${e.label} » ?`} size="xs" variant="ghost" className="text-destructive">
                        Supprimer
                      </ConfirmActionButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Enregistrer une dépense">
            <ActionForm action={saveExpense} className="space-y-4" resetOnSuccess>
              <TextField name="label" label="Libellé" required placeholder="Ex. Plein carburant Hiace" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField name="category" label="Catégorie" options={EXPENSE_CATEGORIES} defaultValue="carburant" />
                <TextField name="spentAt" type="date" label="Date" defaultValue={today} />
                <TextField name="amountHt" type="number" label="Montant HT" required />
                <TextField name="taxAmount" type="number" label="TVA" defaultValue={0} />
                <SelectField name="vehicleId" label="Véhicule" options={vehicles} placeholder="Aucun" />
                <TextField name="supplier" label="Fournisseur" />
              </div>
              <FileInput name="receipt" label="Justificatif" />
              <SubmitButton className="w-full">Enregistrer</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Reversement à un propriétaire">
            <div id="reversement" />
            <ActionForm action={recordOwnerPayout} className="space-y-4" resetOnSuccess>
              <SelectField name="ownerId" label="Propriétaire" required options={owners} placeholder="Choisir" defaultValue={preOwner} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="amount" type="number" label="Montant (FCFA)" required />
                <TextField name="paidAt" type="date" label="Date" defaultValue={today} />
                <SelectField name="method" label="Moyen" options={PAYMENT_METHODS} defaultValue="wave" />
                <TextField name="reference" label="Référence" />
              </div>
              <TextAreaField name="notes" label="Période ou détail (visible par le propriétaire)" rows={2} />
              <SubmitButton className="w-full">Enregistrer le reversement</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
