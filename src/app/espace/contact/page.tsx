import { Card, PageHeader } from "@/components/app/ui";
import { ContactForm } from "@/components/site/contact-form";
import { requireRole } from "@/server/auth";

export const metadata = { title: "Contacter l'équipe" };

export default async function ClientContactPage() {
  const user = await requireRole("client");
  return (
    <>
      <PageHeader title="Contacter l'équipe" description="Une question sur une demande, un devis ou une facture ? Écrivez-nous." />
      <Card>
        <ContactForm defaults={{ name: user.fullName, email: user.email, phone: user.phone ?? undefined }} />
      </Card>
    </>
  );
}
