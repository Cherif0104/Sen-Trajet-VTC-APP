import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default async function MentionsPage() {
  const { legal, company } = await getSettings();
  return (
    <LegalPage
      title="Mentions légales"
      content={legal.mentions}
      facts={[
        ["Société", company.legalName],
        ["Marque", "SENTRAJET PREMIUM"],
        ["NINEA", company.ninea],
        ["RCCM", company.rccm],
        ["Adresse", [company.address, company.city, "Sénégal"].filter(Boolean).join(", ")],
        ["Téléphone", company.phone],
        ["E-mail", company.email],
      ]}
    />
  );
}
