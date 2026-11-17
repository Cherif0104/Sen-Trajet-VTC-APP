import Link from "next/link";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getOwnerForUser, ownerDocuments } from "@/server/queries/owner";
import { DOC_STATUSES, docTypeLabel } from "@/lib/domain";
import { fdate } from "@/lib/format";

export const metadata = { title: "Mes documents" };

export default async function OwnerDocumentsPage() {
  const user = await requireRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner) return <EmptyState title="Profil propriétaire introuvable" />;
  const docs = (await ownerDocuments(owner.id)).filter((d) => d.docType !== "photo");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Mes documents" description="Documents transmis pour vos véhicules. Surveillez les dates d'expiration." />
      <DataTable
        columns={[
          { key: "doc", label: "Document" },
          { key: "vehicle", label: "Véhicule" },
          { key: "exp", label: "Expiration" },
          { key: "status", label: "Statut" },
        ]}
        rows={docs.map((d) => ({
          key: d.id,
          cells: {
            doc: (
              <a href={`/api/files/${d.fileId}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-gold">
                {docTypeLabel(d.docType)}
                <span className="block text-xs font-normal text-muted-foreground">{d.fileName}</span>
              </a>
            ),
            vehicle: (
              <Link href={`/proprietaire/vehicules/${d.submission.id}`} className="hover:text-gold">
                {d.submission.brand} {d.submission.model}
              </Link>
            ),
            exp: d.expiresAt ? <span className={d.expiresAt < today ? "font-semibold text-red-600" : ""}>{fdate(d.expiresAt)}</span> : "—",
            status: <StatusBadge list={DOC_STATUSES} value={d.status} />,
          },
        }))}
        empty={<EmptyState title="Aucun document" text="Ajoutez les documents de vos véhicules depuis la page de chaque dossier." />}
      />
    </>
  );
}
