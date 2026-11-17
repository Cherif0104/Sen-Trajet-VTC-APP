import Image from "next/image";
import { RowsEditor } from "@/components/app/rows-editor";
import { Card, PageHeader } from "@/components/app/ui";
import { FileInput } from "@/components/file-input";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { saveContentSection } from "@/server/actions/admin-content";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Contenus du site" };

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card title={title} className="scroll-mt-24">
      <div id={id} />
      {description && <p className="-mt-1 mb-4 text-sm text-muted-foreground">{description}</p>}
      <ActionForm action={saveContentSection} className="space-y-4">
        <input type="hidden" name="section" value={id} />
        {children}
        <div className="flex justify-end">
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

export default async function ContentPage() {
  await requirePermission("content.manage");
  const s = await getSettings();
  const nav = [
    ["branding", "Logo"],
    ["company", "Coordonnées"],
    ["hero", "Accueil"],
    ["stats", "Chiffres clés"],
    ["about", "À propos"],
    ["faq", "FAQ"],
    ["social", "Réseaux sociaux"],
    ["legal", "Pages légales"],
  ];
  return (
    <>
      <PageHeader title="Contenus du site" description="Les modifications sont visibles immédiatement sur le site public." />
      <nav className="mb-6 flex flex-wrap gap-2">
        {nav.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-border bg-white px-3 py-1.5 text-sm hover:border-gold">
            {label}
          </a>
        ))}
      </nav>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section id="branding" title="Logo officiel" description="Tant qu'aucun logo n'est téléversé, le site affiche le nom SENTRAJET PREMIUM en typographie.">
          {s.branding.logoUrl && (
            <div className="flex items-center gap-4 rounded-lg bg-ink p-4">
              <Image src={s.branding.logoUrl} alt="Logo actuel" width={160} height={48} className="h-12 w-auto object-contain" unoptimized />
            </div>
          )}
          <FileInput name="logo" label="Fichier du logo (PNG ou WebP sur fond transparent)" accept="image/png,image/webp,image/jpeg" />
          {s.branding.logoUrl && <CheckboxField name="removeLogo" label="Revenir au logo typographique" />}
        </Section>

        <Section id="company" title="Coordonnées de l'entreprise" description="Utilisées dans le pied de page, la page contact, les PDF et les mentions légales. Laissez vide ce qui n'est pas encore confirmé.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="legalName" label="Raison sociale" required defaultValue={s.company.legalName} />
            <TextField name="phone" label="Téléphone affiché" required defaultValue={s.company.phone} />
            <TextField name="whatsapp" label="WhatsApp (format international sans +)" defaultValue={s.company.whatsapp} />
            <TextField name="email" type="email" label="E-mail de contact" defaultValue={s.company.email} />
            <TextField name="address" label="Adresse" defaultValue={s.company.address} />
            <TextField name="city" label="Ville" defaultValue={s.company.city} />
            <TextField name="hours" label="Horaires" defaultValue={s.company.hours} placeholder="Ex. Lun–Sam, 7h–21h" />
            <TextField name="ninea" label="NINEA" defaultValue={s.company.ninea} />
            <TextField name="rccm" label="RCCM" defaultValue={s.company.rccm} />
          </div>
        </Section>

        <Section id="hero" title="Bandeau d'accueil">
          <TextField name="title" label="Titre" required defaultValue={s.hero.title} />
          <TextAreaField name="subtitle" label="Sous-titre" required rows={3} defaultValue={s.hero.subtitle} />
        </Section>

        <Section id="stats" title="Chiffres clés" description="Affichés sur l'accueil uniquement s'ils sont renseignés. N'indiquez que des chiffres réels et vérifiables.">
          <RowsEditor
            max={6}
            addLabel="Ajouter un chiffre"
            fields={[
              { name: "stat_value", label: "Valeur", placeholder: "Ex. 120" },
              { name: "stat_label", label: "Libellé", placeholder: "Ex. missions réalisées en 2026" },
            ]}
            initial={s.stats.map((x) => ({ stat_value: x.value, stat_label: x.label }))}
          />
        </Section>

        <Section id="about" title="Page À propos">
          <TextAreaField name="intro" label="Présentation" required rows={4} defaultValue={s.about.intro} />
          <TextAreaField name="mission" label="Mission" rows={3} defaultValue={s.about.mission} />
          <TextAreaField name="vision" label="Vision" rows={3} defaultValue={s.about.vision} />
          <TextAreaField name="values" label="Valeurs (une par ligne)" rows={4} defaultValue={s.about.values.join("\n")} />
        </Section>

        <Section id="social" title="Réseaux sociaux" description="Les icônes n'apparaissent que pour les comptes renseignés.">
          <TextField name="facebook" label="Facebook" placeholder="https://" defaultValue={s.social.facebook} />
          <TextField name="instagram" label="Instagram" placeholder="https://" defaultValue={s.social.instagram} />
          <TextField name="linkedin" label="LinkedIn" placeholder="https://" defaultValue={s.social.linkedin} />
        </Section>
      </div>

      <div className="mt-6 space-y-6">
        <Section id="faq" title="Questions fréquentes">
          <RowsEditor
            max={30}
            addLabel="Ajouter une question"
            fields={[
              { name: "faq_q", label: "Question" },
              { name: "faq_a", label: "Réponse", multiline: true },
            ]}
            initial={s.faq.map((x) => ({ faq_q: x.q, faq_a: x.a }))}
          />
        </Section>
        <Section
          id="legal"
          title="Pages légales"
          description="Collez les textes validés par votre conseil juridique. Tant qu'un texte est vide, la page indique qu'il est en cours de rédaction."
        >
          <TextAreaField name="mentions" label="Mentions légales" rows={8} defaultValue={s.legal.mentions} />
          <TextAreaField name="confidentialite" label="Politique de confidentialité" rows={8} defaultValue={s.legal.confidentialite} />
          <TextAreaField name="cgv" label="Conditions générales de vente" rows={8} defaultValue={s.legal.cgv} />
        </Section>
      </div>
    </>
  );
}
