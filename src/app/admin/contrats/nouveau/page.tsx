import { ContractForm } from "@/components/app/contract-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { customerOptions, ownerOptions, vehicleOptions } from "@/server/queries/admin";

export const metadata = { title: "Nouveau contrat" };

export default async function NewContract({ searchParams }: PageProps<"/admin/contrats/nouveau">) {
  await requirePermission("contracts.manage");
  const sp = await searchParams;
  const ownerId = typeof sp.proprietaire === "string" ? sp.proprietaire : undefined;
  const customerId = typeof sp.client === "string" ? sp.client : undefined;
  const [customers, owners, vehicles] = await Promise.all([customerOptions(), ownerOptions(), vehicleOptions()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/contrats", label: "Contrats" }} title="Nouveau contrat" description="Enregistrez ici les contrats rédigés et validés juridiquement ; la plateforme n'en génère pas le texte." />
      <Card>
        <ContractForm options={{ customers, owners, vehicles }} defaults={{ type: ownerId ? "proprietaire" : "client", ownerId, customerId }} />
      </Card>
    </>
  );
}
