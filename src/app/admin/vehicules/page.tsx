import Image from "next/image";
import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf } from "@/server/queries/admin";
import { COMMERCIAL_STATUSES, PUBLICATION_STATUSES, TECHNICAL_STATUSES } from "@/lib/domain";
import { fcfa } from "@/lib/format";

export const metadata = { title: "Véhicules" };

export default async function AdminVehicles({ searchParams }: PageProps<"/admin/vehicules">) {
  await requirePermission("vehicles.manage");
  const sp = await searchParams;
  const q = qOf(sp);
  const pub = qOf(sp, "pub");
  const tech = qOf(sp, "tech");
  const cat = qOf(sp, "cat");
  const db = await getDb();
  const conds: SQL[] = [];
  if (pub) conds.push(eq(schema.vehicles.publicationStatus, pub));
  if (tech) conds.push(eq(schema.vehicles.technicalStatus, tech));
  if (cat) conds.push(eq(schema.vehicles.categoryId, cat));
  if (q) conds.push(or(ilike(schema.vehicles.brand, `%${q}%`), ilike(schema.vehicles.model, `%${q}%`), ilike(schema.vehicles.plate, `%${q}%`))!);
  const [rows, categories] = await Promise.all([
    db
      .select({ v: schema.vehicles, category: schema.categories.name, owner: schema.owners.fullName })
      .from(schema.vehicles)
      .leftJoin(schema.categories, eq(schema.categories.id, schema.vehicles.categoryId))
      .leftJoin(schema.owners, eq(schema.owners.id, schema.vehicles.ownerId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(schema.vehicles.brand), asc(schema.vehicles.model)),
    db.select({ value: schema.categories.id, label: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
  ]);

  return (
    <>
      <PageHeader title="Véhicules" description={`${rows.length} véhicule(s)`} actions={<ButtonLink href="/admin/vehicules/nouveau">Ajouter un véhicule</ButtonLink>} />
      <FilterBar action="/admin/vehicules" q={q} placeholder="Marque, modèle, immatriculation…">
        <FilterSelect name="cat" value={cat} options={categories} placeholder="Toutes catégories" />
        <FilterSelect name="pub" value={pub} options={PUBLICATION_STATUSES} placeholder="Toute publication" />
        <FilterSelect name="tech" value={tech} options={TECHNICAL_STATUSES} placeholder="Tout état technique" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "v", label: "Véhicule" },
          { key: "c", label: "Catégorie" },
          { key: "p", label: "Tarif / jour" },
          { key: "com", label: "Commercial" },
          { key: "t", label: "Technique" },
          { key: "pub", label: "Site" },
        ]}
        rows={rows.map(({ v, category, owner }) => ({
          key: v.id,
          href: `/admin/vehicules/${v.id}`,
          cells: {
            v: (
              <span className="flex items-center gap-3">
                <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-md bg-mist">
                  {v.coverImage && <Image src={v.coverImage} alt="" fill sizes="56px" className="object-cover" unoptimized={v.coverImage.startsWith("/api/")} />}
                </span>
                <span>
                  <span className="block font-medium">
                    {v.brand} {v.model}
                  </span>
                  <span className="text-xs text-muted-foreground">{[v.plate, owner && `Partenaire : ${owner}`].filter(Boolean).join(" · ") || "—"}</span>
                </span>
              </span>
            ),
            c: category ?? "—",
            p: v.priceDay ? (
              <span>
                {fcfa(v.priceDay)}
                {!v.pricesValidated && <span className="block text-xs text-amber-700">Non validé</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">Sur devis</span>
            ),
            com: <StatusBadge list={COMMERCIAL_STATUSES} value={v.commercialStatus} />,
            t: <StatusBadge list={TECHNICAL_STATUSES} value={v.technicalStatus} />,
            pub: <StatusBadge list={PUBLICATION_STATUSES} value={v.publicationStatus} />,
          },
        }))}
        empty={<EmptyState title="Aucun véhicule" action={<ButtonLink href="/admin/vehicules/nouveau">Ajouter un véhicule</ButtonLink>} />}
      />
    </>
  );
}
