import { desc } from "drizzle-orm";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Badge, Card, PageHeader } from "@/components/app/ui";
import { ActionForm, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { retryEmail, saveContentSection } from "@/server/actions/admin-content";
import { getSettings } from "@/server/settings";
import { fdatetime } from "@/lib/format";
import { ROLE_PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions";
import { roleLabel } from "@/lib/domain";

export const metadata = { title: "Paramètres" };

const EMAIL_TONES = { envoye: "success", simule: "info", echec: "danger", en_attente: "warning" } as const;
const EMAIL_LABELS = { envoye: "Envoyé", simule: "Simulé (Resend non configuré)", echec: "Échec", en_attente: "En attente" } as const;

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const db = await getDb();
  const [s, emails] = await Promise.all([getSettings(), db.select().from(schema.emailOutbox).orderBy(desc(schema.emailOutbox.createdAt)).limit(30)]);
  const checks: [string, boolean, string][] = [
    ["Base de données Postgres (production)", Boolean(process.env.DATABASE_URL), "Sans DATABASE_URL, une base locale PGlite est utilisée."],
    ["Envoi d'e-mails (Resend)", Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), "Renseignez RESEND_API_KEY et EMAIL_FROM. En attendant, les e-mails sont journalisés ici sans être envoyés."],
    ["Adresse de notification interne", Boolean(process.env.ADMIN_NOTIFICATION_EMAIL), "ADMIN_NOTIFICATION_EMAIL ; à défaut, les administrateurs sont notifiés."],
    ["URL publique du site", Boolean(process.env.NEXT_PUBLIC_SITE_URL), "NEXT_PUBLIC_SITE_URL, utilisée pour les liens des e-mails et le SEO."],
    ["Logo officiel", Boolean(s.branding.logoUrl), "À téléverser dans Contenus du site."],
    ["Coordonnées légales (NINEA, RCCM, adresse)", Boolean(s.company.ninea && s.company.rccm && s.company.address), "À compléter dans Contenus du site."],
    ["Textes légaux", Boolean(s.legal.mentions && s.legal.confidentialite && s.legal.cgv), "Mentions, confidentialité et CGV validées juridiquement."],
  ];

  return (
    <>
      <PageHeader title="Paramètres" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Configuration">
          <ul className="space-y-3">
            {checks.map(([label, ok, hint]) => (
              <li key={label} className="flex gap-3">
                {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />}
                <span className="text-sm">
                  <span className="font-medium">{label}</span>
                  {!ok && <span className="block text-xs text-muted-foreground">{hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Facturation">
          <ActionForm action={saveContentSection} className="space-y-4">
            <input type="hidden" name="section" value="finance" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="taxRate" type="number" label="Taux de TVA par défaut (%)" defaultValue={s.finance.taxRate} hint="Taux appliqué aux nouveaux devis et factures." />
              <TextField name="quoteValidityDays" type="number" label="Validité des devis (jours)" defaultValue={s.finance.quoteValidityDays} />
            </div>
            <TextAreaField name="paymentTerms" label="Conditions de paiement par défaut" rows={3} defaultValue={s.finance.paymentTerms} hint="Pré-remplies sur les devis et factures. À valider par la direction." />
            <div className="flex justify-end">
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>

      <Card title="Rôles et permissions" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Module</th>
                {(["super_admin", "admin", "commercial", "flotte", "financier"] as const).map((r) => (
                  <th key={r} className="px-2 py-2 text-center font-medium">
                    {roleLabel(r)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                <tr key={perm}>
                  <td className="py-2 pr-3">{label}</td>
                  {(["super_admin", "admin", "commercial", "flotte", "financier"] as const).map((r) => (
                    <td key={r} className="px-2 py-2 text-center">
                      {(ROLE_PERMISSIONS[r] as readonly string[]).includes(perm) ? <CheckCircle2 className="mx-auto size-4 text-emerald-600" /> : <span className="text-neutral-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Clients, propriétaires et chauffeurs n'ont accès qu'à leur propre espace et à leurs propres données.</p>
      </Card>

      <Card title="Derniers e-mails" className="mt-6">
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun e-mail émis.</p>
        ) : (
          <ul className="-my-2 divide-y divide-border text-sm">
            {emails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{e.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.to} · {fdatetime(e.createdAt)}
                    {e.error ? ` · ${e.error.slice(0, 120)}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={EMAIL_TONES[e.status as keyof typeof EMAIL_TONES] ?? "muted"}>{EMAIL_LABELS[e.status as keyof typeof EMAIL_LABELS] ?? e.status}</Badge>
                  {e.status !== "envoye" && (
                    <ConfirmActionButton action={retryEmail} fields={{ id: e.id }} size="xs" variant="outline">
                      Renvoyer
                    </ConfirmActionButton>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
