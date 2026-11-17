import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Conditions générales", alternates: { canonical: "/cgv" } };

export default async function CgvPage() {
  const { legal } = await getSettings();
  return <LegalPage title="Conditions générales de vente et d'utilisation" content={legal.cgv} />;
}
