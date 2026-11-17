export type SiteSettings = {
  company: {
    legalName: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    hours: string;
    ninea: string;
    rccm: string;
  };
  branding: { logoUrl: string | null };
  hero: { title: string; subtitle: string };
  stats: { label: string; value: string }[];
  about: { intro: string; mission: string; vision: string; values: string[] };
  social: { facebook: string; instagram: string; linkedin: string };
  faq: { q: string; a: string }[];
  legal: { mentions: string; confidentialite: string; cgv: string };
  finance: { taxRate: number; quoteValidityDays: number; paymentTerms: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  company: {
    legalName: "IMPULCIA AFRIQUE",
    phone: "+221 78 832 40 69",
    whatsapp: "221788324069",
    email: "",
    address: "",
    city: "Dakar",
    hours: "",
    ninea: "",
    rccm: "",
  },
  branding: { logoUrl: null },
  hero: {
    title: "Votre mobilité, notre engagement.",
    subtitle:
      "Location de véhicules avec chauffeur, solutions corporate, transport de groupes et voyages interurbains au départ de Dakar. Un service exécutif, ponctuel et discret.",
  },
  stats: [],
  about: {
    intro:
      "SENTRAJET PREMIUM est la marque de mobilité exécutive d'IMPULCIA AFRIQUE. Nous accompagnons particuliers, entreprises, institutions et organisations dans leurs déplacements au Sénégal, avec des véhicules entretenus et des chauffeurs professionnels.",
    mission:
      "Offrir une mobilité fiable, sûre et confortable, du transfert aéroport aux missions de plusieurs jours en régions, avec un interlocuteur unique et un suivi rigoureux.",
    vision:
      "Devenir la référence de la mobilité premium au Sénégal en associant un service humain exigeant à des outils numériques transparents pour nos clients et nos partenaires propriétaires.",
    values: ["Ponctualité", "Discrétion", "Sécurité", "Transparence", "Exigence de service"],
  },
  social: { facebook: "", instagram: "", linkedin: "" },
  faq: [
    {
      q: "Comment réserver un véhicule ?",
      a: "Remplissez le formulaire de demande de réservation en précisant le service, les dates, le lieu de prise en charge et vos coordonnées. Vous recevez immédiatement une référence, puis notre équipe vous recontacte pour confirmer la disponibilité et le tarif.",
    },
    {
      q: "La réservation est-elle confirmée dès l'envoi du formulaire ?",
      a: "Non. L'envoi du formulaire crée une demande. La réservation est confirmée par notre équipe après vérification de la disponibilité et, si nécessaire, validation d'un devis.",
    },
    {
      q: "Puis-je demander un devis sans choisir de véhicule ?",
      a: "Oui. Décrivez votre besoin (nombre de passagers, trajet, durée) et nous vous proposons le véhicule le plus adapté.",
    },
    {
      q: "Proposez-vous des voyages vers les régions ?",
      a: "Oui, au départ de Dakar vers Saint-Louis, Thiès, Touba, Tambacounda, Kédougou, Ziguinchor et d'autres destinations sur demande.",
    },
    {
      q: "Les entreprises peuvent-elles ouvrir un compte ?",
      a: "Oui. Lors de l'inscription, choisissez le type de compte Entreprise, Organisation ou Institution pour retrouver vos demandes, devis et factures dans votre espace client.",
    },
    {
      q: "Comment confier mon véhicule à SENTRAJET PREMIUM ?",
      a: "Créez un compte propriétaire et soumettez votre véhicule avec ses documents. Notre équipe étudie le dossier, organise une inspection puis vous adresse une proposition. Aucun engagement n'est pris avant la signature d'un contrat.",
    },
  ],
  legal: { mentions: "", confidentialite: "", cgv: "" },
  finance: {
    taxRate: 18,
    quoteValidityDays: 15,
    paymentTerms: "",
  },
};

export function mergeSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const row of rows) {
    const base = out[row.key];
    if (base && typeof base === "object" && !Array.isArray(base) && row.value && typeof row.value === "object" && !Array.isArray(row.value)) {
      out[row.key] = { ...(base as object), ...(row.value as object) };
    } else if (row.key in out) {
      out[row.key] = row.value;
    }
  }
  return out as SiteSettings;
}
