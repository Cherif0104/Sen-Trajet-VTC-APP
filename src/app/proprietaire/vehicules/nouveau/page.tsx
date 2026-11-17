import { SubmissionForm } from "@/components/app/submission-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requireRole } from "@/server/auth";

export const metadata = { title: "Proposer un véhicule" };

export default async function NewSubmissionPage() {
  await requireRole("proprietaire");
  return (
    <>
      <PageHeader back={{ href: "/proprietaire/vehicules", label: "Mes véhicules" }} title="Proposer un véhicule" description="Décrivez votre véhicule : notre équipe étudie chaque dossier avec attention." />
      <Card>
        <SubmissionForm />
      </Card>
    </>
  );
}
