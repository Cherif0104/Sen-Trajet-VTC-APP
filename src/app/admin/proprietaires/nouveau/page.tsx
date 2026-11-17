import { OwnerForm } from "@/components/app/owner-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Nouveau propriétaire" };

export default async function NewOwner() {
  await requirePermission("owners.manage");
  return (
    <>
      <PageHeader back={{ href: "/admin/proprietaires", label: "Propriétaires" }} title="Nouveau propriétaire" />
      <Card>
        <OwnerForm />
      </Card>
    </>
  );
}
