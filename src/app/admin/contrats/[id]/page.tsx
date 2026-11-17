import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { ContractForm } from "@/components/app/contract-form";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions, ownerOptions, vehicleOptions } from "@/server/queries/admin";
import { CONTRACT_STATUSES } from "@/lib/domain";

export default async function ContractDetail({ params }: PageProps<"/admin/contrats/[id]">) {
  await requirePermission("contracts.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [c] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id)).limit(1);
  if (!c) notFound();
  const [customers, owners, vehicles] = await Promise.all([customerOptions(), ownerOptions(), vehicleOptions(true)]);
  return (
    <>
      <PageHeader
        back={{ href: "/admin/contrats", label: "Contrats" }}
        title={c.title}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{c.number}</span> <StatusBadge list={CONTRACT_STATUSES} value={c.status} />
            {c.sharedWithParty && <span>· Partagé avec le propriétaire</span>}
          </span>
        }
        actions={
          c.fileId && (
            <ButtonLink href={`/api/files/${c.fileId}`} target="_blank" variant="outline">
              <FileText className="size-4" /> Ouvrir le document
            </ButtonLink>
          )
        }
      />
      <Card>
        <ContractForm contract={c} options={{ customers, owners, vehicles }} />
      </Card>
    </>
  );
}
