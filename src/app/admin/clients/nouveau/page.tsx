import { CustomerForm } from "@/components/app/customer-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Nouveau client" };

export default async function NewCustomer() {
  await requirePermission("customers.manage");
  return (
    <>
      <PageHeader back={{ href: "/admin/clients", label: "Clients" }} title="Nouveau client" />
      <Card>
        <CustomerForm />
      </Card>
    </>
  );
}
