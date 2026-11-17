import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default async function PrivacyPage() {
  const { legal } = await getSettings();
  return (
    <LegalPage title="Politique de confidentialité" content={legal.confidentialite}>
      <div className="space-y-3 rounded-2xl bg-mist p-6 text-sm leading-relaxed">
        <h2 className="text-base font-semibold">Données traitées par ce site</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-graphite/85">
          <li>Les informations saisies dans les formulaires de réservation, de devis, de contact et d&apos;inscription (identité, coordonnées, détails du trajet).</li>
          <li>Les documents que vous téléversez dans votre espace (par exemple les documents d&apos;un véhicule proposé en partenariat). Ils ne sont accessibles qu&apos;à vous et à l&apos;équipe habilitée.</li>
          <li>Un cookie de session strictement nécessaire à la connexion à votre espace. Aucun cookie publicitaire n&apos;est utilisé.</li>
        </ul>
      </div>
    </LegalPage>
  );
}
