import { Download } from "lucide-react";
import { PeriodFilter } from "@/components/app/period-filter";
import { Card, PageHeader, StatCard } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { financeReport, periodOf, unpaidInvoices } from "@/server/queries/finance";
import { expenseCategoryLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Rapports & exports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/rapports">) {
  await requirePermission("reports.view");
  const sp = await searchParams;
  const period = periodOf(sp);
  const [r, unpaid] = await Promise.all([financeReport(period), unpaidInvoices()]);
  const t = r.totals;
  const qs = `from=${period.from}&to=${period.to}`;
  const exports = [
    { kind: "factures", label: "Factures émises" },
    { kind: "paiements", label: "Encaissements et reversements" },
    { kind: "depenses", label: "Dépenses" },
    { kind: "demandes", label: "Demandes et réservations" },
  ];
  return (
    <>
      <PageHeader
        title="Rapports & exports"
        description="Synthèse HT / TVA / TTC sur la période. Les exports CSV s'ouvrent dans Excel."
        actions={
          <ButtonLink href={`/api/export/synthese?${qs}`} target="_blank">
            <Download className="size-4" /> Synthèse PDF
          </ButtonLink>
        }
      />
      <PeriodFilter action="/admin/rapports" from={period.from} to={period.to} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Chiffre d'affaires facturé">
          <dl className="space-y-2 text-sm">
            <Row label="Total HT" value={fcfa(t.billedHt)} />
            <Row label="TVA collectée" value={fcfa(t.billedTax)} />
            <Row label="Total TTC" value={fcfa(t.billedTtc)} strong />
            <Row label={`Nombre de factures`} value={String(r.invoices.length)} />
          </dl>
        </Card>
        <Card title="Charges">
          <dl className="space-y-2 text-sm">
            <Row label="Dépenses HT" value={fcfa(t.expHt)} />
            <Row label="TVA déductible" value={fcfa(t.expTax)} />
            <Row label="Dépenses TTC" value={fcfa(t.expTtc)} strong />
            <Row label="Reversements propriétaires" value={fcfa(t.payouts)} />
          </dl>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Encaissé sur la période" value={fcfa(t.cashIn)} />
        <StatCard label="Solde de TVA (collectée − déductible)" value={fcfa(t.vatBalance)} hint="Indicatif : à valider par votre comptable." />
        <StatCard label="Résultat de trésorerie" value={fcfa(t.net)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Dépenses par catégorie">
          {r.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépense.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {r.byCategory.map(([cat, amount]) => (
                <li key={cat}>
                  <div className="flex justify-between">
                    <span>{expenseCategoryLabel(cat)}</span>
                    <span className="font-medium">{fcfa(amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-mist">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round((amount / Math.max(1, t.expTtc)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Exports CSV (Excel)">
          <ul className="space-y-2">
            {exports.map((e) => (
              <li key={e.kind}>
                <a href={`/api/export/${e.kind}?${qs}`} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:border-gold">
                  {e.label}
                  <Download className="size-4 text-gold" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={`Factures impayées (${unpaid.length})`} className="mt-6">
        {unpaid.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune facture en attente de paiement.</p>
        ) : (
          <ul className="-my-2 divide-y divide-border text-sm">
            {unpaid.map(({ i, name, company }) => (
              <li key={i.id}>
                <a href={`/admin/factures/${i.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-gold">
                  <span>
                    <span className="font-mono text-xs">{i.number}</span> · {company ?? name}
                    <span className="block text-xs text-muted-foreground">Échéance {fdate(i.dueAt)}</span>
                  </span>
                  <span className="font-semibold">{fcfa(i.total - i.amountPaid)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-border pt-2 text-base font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
