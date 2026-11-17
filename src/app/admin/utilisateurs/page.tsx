import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Badge, Card, FilterBar, FilterSelect, PageHeader } from "@/components/app/ui";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf } from "@/server/queries/admin";
import { createUser, resetUserPassword, updateUser } from "@/server/actions/admin-content";
import { ACCOUNT_TYPES, ROLES, roleLabel } from "@/lib/domain";
import { fdatetime } from "@/lib/format";

export const metadata = { title: "Utilisateurs & rôles" };

const STATUSES = [
  { value: "actif", label: "Actif" },
  { value: "suspendu", label: "Suspendu" },
];

export default async function UsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const me = await requirePermission("users.manage");
  const sp = await searchParams;
  const q = qOf(sp);
  const role = qOf(sp, "role");
  const db = await getDb();
  const conds: SQL[] = [];
  if (role) conds.push(eq(schema.users.role, role));
  if (q) conds.push(or(ilike(schema.users.fullName, `%${q}%`), ilike(schema.users.email, `%${q}%`))!);
  const rows = await db
    .select({ id: schema.users.id, fullName: schema.users.fullName, email: schema.users.email, role: schema.users.role, status: schema.users.status, lastLoginAt: schema.users.lastLoginAt, companyName: schema.users.companyName })
    .from(schema.users)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(schema.users.role), asc(schema.users.fullName))
    .limit(300);
  const assignable = ROLES.filter((r) => r.value !== "super_admin" || me.role === "super_admin");

  return (
    <>
      <PageHeader title="Utilisateurs & rôles" description="Chaque rôle n'accède qu'aux modules autorisés ; les contrôles sont faits côté serveur." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <FilterBar action="/admin/utilisateurs" q={q} placeholder="Nom ou e-mail">
            <FilterSelect name="role" value={role} options={ROLES} placeholder="Tous les rôles" />
          </FilterBar>
          <ul className="space-y-3">
            {rows.map((u) => {
              const locked = u.role === "super_admin" && me.role !== "super_admin";
              return (
                <li key={u.id}>
                  <details className="rounded-2xl border border-border bg-white">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {u.fullName} {u.id === me.id && <span className="text-xs text-muted-foreground">(vous)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {u.email}
                          {u.companyName ? ` · ${u.companyName}` : ""} · {u.lastLoginAt ? `dernière connexion ${fdatetime(u.lastLoginAt)}` : "jamais connecté"}
                        </span>
                      </span>
                      <Badge tone={["super_admin", "admin"].includes(u.role) ? "gold" : "muted"}>{roleLabel(u.role)}</Badge>
                      {u.status !== "actif" && <Badge tone="danger">Suspendu</Badge>}
                    </summary>
                    <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
                      {locked ? (
                        <p className="text-sm text-muted-foreground md:col-span-2">Seul un super administrateur peut modifier ce compte.</p>
                      ) : (
                        <>
                          <ActionForm action={updateUser} className="space-y-3">
                            <input type="hidden" name="id" value={u.id} />
                            <SelectField name="role" label="Rôle" options={assignable} defaultValue={u.role} />
                            <SelectField name="status" label="Statut" options={STATUSES} defaultValue={u.status} />
                            <SubmitButton variant="outline" className="w-full">
                              Mettre à jour
                            </SubmitButton>
                          </ActionForm>
                          <ActionForm action={resetUserPassword} className="space-y-3" resetOnSuccess>
                            <input type="hidden" name="id" value={u.id} />
                            <TextField name="password" type="text" label="Nouveau mot de passe provisoire" autoComplete="off" minLength={10} />
                            <SubmitButton variant="outline" className="w-full">
                              Réinitialiser
                            </SubmitButton>
                          </ActionForm>
                        </>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
        <Card title="Créer un compte" className="h-fit">
          <ActionForm action={createUser} className="space-y-4" resetOnSuccess>
            <TextField name="fullName" label="Nom complet" required />
            <TextField name="email" type="email" label="E-mail" required />
            <TextField name="phone" type="tel" label="Téléphone" />
            <SelectField name="role" label="Rôle" options={assignable} defaultValue="commercial" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="accountType" label="Type (clients)" options={ACCOUNT_TYPES} defaultValue="particulier" />
              <TextField name="companyName" label="Structure" />
            </div>
            <TextField name="password" type="text" label="Mot de passe provisoire" required autoComplete="off" hint="10 caractères minimum. À transmettre par un canal sûr." />
            <CheckboxField name="sendEmail" label="Envoyer un e-mail d'invitation (sans le mot de passe)" defaultChecked />
            <SubmitButton className="w-full">Créer le compte</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
