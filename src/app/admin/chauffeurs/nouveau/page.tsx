import { DriverForm } from "@/components/app/driver-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Nouveau chauffeur" };

export default async function NewDriver() {
  await requirePermission("drivers.manage");
  return (
    <>
      <PageHeader back={{ href: "/admin/chauffeurs", label: "Chauffeurs" }} title="Nouveau chauffeur" />
      <Card>
        <DriverForm />
      </Card>
    </>
  );
}
