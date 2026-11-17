export const BRAND = {
  name: "SENTRAJET PREMIUM",
  company: "IMPULCIA AFRIQUE",
  tagline: "Executive Chauffeur & Mobility Services",
  slogan: "Votre mobilité, notre engagement.",
  phone: "+221 78 832 40 69",
  whatsapp: "221788324069",
  country: "Sénégal",
  currency: "XOF",
};

type Opt = { value: string; label: string };
const labelOf = (list: readonly Opt[], value: string | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? value ?? "—";

export const ROLES = [
  { value: "super_admin", label: "Super administrateur" },
  { value: "admin", label: "Administrateur" },
  { value: "commercial", label: "Commercial" },
  { value: "flotte", label: "Gestionnaire de flotte" },
  { value: "financier", label: "Financier" },
  { value: "client", label: "Client" },
  { value: "proprietaire", label: "Propriétaire partenaire" },
  { value: "chauffeur", label: "Chauffeur" },
] as const;
export type Role = (typeof ROLES)[number]["value"];
export const STAFF_ROLES: Role[] = ["super_admin", "admin", "commercial", "flotte", "financier"];
export const roleLabel = (v: string) => labelOf(ROLES, v);

export const ACCOUNT_TYPES = [
  { value: "particulier", label: "Particulier" },
  { value: "entreprise", label: "Entreprise" },
  { value: "organisation", label: "Organisation / ONG" },
  { value: "institution", label: "Institution" },
] as const;
export const accountTypeLabel = (v: string) => labelOf(ACCOUNT_TYPES, v);

export const SERVICES = [
  {
    slug: "location-avec-chauffeur",
    value: "location_chauffeur",
    title: "Location avec chauffeur",
    short: "Un chauffeur professionnel et un véhicule entretenu, à l'heure, à la journée ou sur plusieurs jours.",
    image: "/images/chauffeur.webp",
    points: [
      "Chauffeurs expérimentés, ponctuels et discrets",
      "Mise à disposition à l'heure, à la journée ou à la semaine",
      "Transferts aéroport AIBD, rendez-vous d'affaires, événements",
      "Véhicules propres, contrôlés avant chaque mission",
    ],
    audience: "Particuliers, cadres, délégations et visiteurs",
  },
  {
    slug: "location-corporate",
    value: "corporate",
    title: "Location corporate",
    short: "Des solutions de mobilité sur mesure pour les entreprises, institutions et organisations.",
    image: "/images/corporate.webp",
    points: [
      "Contrats de mise à disposition mensuels ou ponctuels",
      "Interlocuteur dédié et facturation entreprise",
      "Accueil de délégations et de partenaires",
      "Suivi des prestations depuis votre espace client",
    ],
    audience: "Entreprises, institutions, ambassades, ONG",
  },
  {
    slug: "groupes-et-minibus",
    value: "groupes",
    title: "Transport de groupes et minibus",
    short: "Minibus avec chauffeur pour séminaires, mariages, conférences, excursions et équipes.",
    image: "/images/groupes.webp",
    points: [
      "Navettes séminaires, conférences et événements",
      "Mariages, cérémonies et sorties de groupe",
      "Transport du personnel",
      "Coordination logistique sur plusieurs véhicules",
    ],
    audience: "Organisateurs d'événements, entreprises, familles",
  },
  {
    slug: "voyages-interurbains",
    value: "interurbain",
    title: "Voyages interurbains",
    short: "Des trajets confortables au départ de Dakar vers les principales villes du Sénégal.",
    image: "/images/interurbain.webp",
    points: [
      "Dakar – Saint-Louis, Thiès, Touba",
      "Dakar – Tambacounda, Kédougou, Ziguinchor",
      "Aller simple, aller-retour ou circuit sur plusieurs jours",
      "Chauffeurs habitués aux longues distances",
    ],
    audience: "Voyageurs, familles, professionnels en déplacement",
  },
  {
    slug: "missions-terrain",
    value: "mission_terrain",
    title: "Missions terrain",
    short: "Pick-up et 4x4 avec chauffeur pour les missions en régions, chantiers et projets de développement.",
    image: "/images/mission-terrain.webp",
    points: [
      "Véhicules adaptés aux pistes et zones rurales",
      "Missions de plusieurs jours en régions",
      "ONG, bureaux d'études, projets et chantiers",
      "Planification avec votre équipe projet",
    ],
    audience: "ONG, bureaux d'études, projets, entreprises BTP",
  },
  {
    slug: "partenariat-proprietaires",
    value: "partenariat",
    title: "Partenariat propriétaires",
    short: "Confiez votre véhicule à SENTRAJET PREMIUM et suivez son exploitation en toute transparence.",
    image: "/images/partenariat.webp",
    points: [
      "Étude de votre véhicule et inspection",
      "Proposition de partenariat et contrat écrit",
      "Suivi de l'exploitation depuis votre espace propriétaire",
      "Reversements tracés selon les termes du contrat signé",
    ],
    audience: "Particuliers et entreprises propriétaires de véhicules",
  },
] as const;
export const SERVICE_OPTIONS: Opt[] = SERVICES.filter((s) => s.value !== "partenariat").map((s) => ({
  value: s.value,
  label: s.title,
}));
export const serviceLabel = (v: string) => SERVICES.find((s) => s.value === v)?.title ?? v;

export const INTERCITY_DESTINATIONS = ["Saint-Louis", "Thiès", "Touba", "Tambacounda", "Kédougou", "Ziguinchor"];

export const REQUEST_STATUSES = [
  { value: "nouvelle", label: "Nouvelle demande", tone: "gold" },
  { value: "en_attente", label: "En attente de traitement", tone: "muted" },
  { value: "verification", label: "En cours de vérification", tone: "info" },
  { value: "devis_envoye", label: "Devis envoyé", tone: "info" },
  { value: "attente_client", label: "En attente de validation client", tone: "warning" },
  { value: "acceptee", label: "Acceptée", tone: "success" },
  { value: "confirmee", label: "Confirmée", tone: "success" },
  { value: "en_cours", label: "En cours d'exécution", tone: "info" },
  { value: "terminee", label: "Terminée", tone: "muted" },
  { value: "annulee", label: "Annulée", tone: "danger" },
  { value: "refusee", label: "Refusée", tone: "danger" },
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number]["value"];
export const RESERVATION_STATUSES: RequestStatus[] = ["acceptee", "confirmee", "en_cours", "terminee"];
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["nouvelle", "en_attente", "verification", "devis_envoye", "attente_client"];
export const requestStatusLabel = (v: string) => labelOf(REQUEST_STATUSES, v);

export const QUOTE_STATUSES = [
  { value: "brouillon", label: "Brouillon", tone: "muted" },
  { value: "envoye", label: "Envoyé", tone: "info" },
  { value: "accepte", label: "Accepté", tone: "success" },
  { value: "refuse", label: "Refusé", tone: "danger" },
  { value: "expire", label: "Expiré", tone: "muted" },
] as const;
export const quoteStatusLabel = (v: string) => labelOf(QUOTE_STATUSES, v);

export const INVOICE_STATUSES = [
  { value: "brouillon", label: "Brouillon", tone: "muted" },
  { value: "emise", label: "Émise", tone: "info" },
  { value: "partielle", label: "Partiellement payée", tone: "warning" },
  { value: "payee", label: "Payée", tone: "success" },
  { value: "annulee", label: "Annulée", tone: "danger" },
] as const;
export const invoiceStatusLabel = (v: string) => labelOf(INVOICE_STATUSES, v);

export const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "cheque", label: "Chèque" },
  { value: "carte", label: "Carte bancaire" },
] as const;
export const paymentMethodLabel = (v: string) => labelOf(PAYMENT_METHODS, v);

export const EXPENSE_CATEGORIES = [
  { value: "carburant", label: "Carburant" },
  { value: "entretien", label: "Entretien et réparations" },
  { value: "assurance", label: "Assurance" },
  { value: "salaires", label: "Salaires chauffeurs" },
  { value: "peage", label: "Péages et stationnement" },
  { value: "reversement", label: "Reversement propriétaire" },
  { value: "administratif", label: "Frais administratifs" },
  { value: "autre", label: "Autre" },
] as const;
export const expenseCategoryLabel = (v: string) => labelOf(EXPENSE_CATEGORIES, v);

export const COMMERCIAL_STATUSES = [
  { value: "sur_demande", label: "Disponible sur demande", tone: "success" },
  { value: "reserve", label: "Réservé", tone: "warning" },
  { value: "indisponible", label: "Indisponible", tone: "danger" },
  { value: "bientot", label: "Bientôt disponible", tone: "info" },
] as const;
export const commercialStatusLabel = (v: string) => labelOf(COMMERCIAL_STATUSES, v);

export const TECHNICAL_STATUSES = [
  { value: "operationnel", label: "Opérationnel", tone: "success" },
  { value: "a_inspecter", label: "À inspecter", tone: "warning" },
  { value: "en_maintenance", label: "En maintenance", tone: "warning" },
  { value: "immobilise", label: "Immobilisé", tone: "danger" },
] as const;
export const technicalStatusLabel = (v: string) => labelOf(TECHNICAL_STATUSES, v);

export const PUBLICATION_STATUSES = [
  { value: "brouillon", label: "Brouillon", tone: "muted" },
  { value: "publie", label: "Publié", tone: "success" },
  { value: "archive", label: "Archivé", tone: "muted" },
] as const;
export const publicationStatusLabel = (v: string) => labelOf(PUBLICATION_STATUSES, v);

export const WITH_DRIVER = [
  { value: "inclus", label: "Avec chauffeur" },
  { value: "sur_demande", label: "Chauffeur sur demande" },
  { value: "sans", label: "Sans chauffeur" },
] as const;
export const withDriverLabel = (v: string) => labelOf(WITH_DRIVER, v);

export const TRANSMISSIONS = [
  { value: "manuelle", label: "Manuelle" },
  { value: "automatique", label: "Automatique" },
] as const;
export const FUELS = [
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybride", label: "Hybride" },
  { value: "electrique", label: "Électrique" },
] as const;
export const optLabel = (list: readonly Opt[], v: string | null | undefined) => (v ? labelOf(list, v) : null);

export const MISSION_STATUSES = [
  { value: "planifiee", label: "Planifiée", tone: "info" },
  { value: "en_cours", label: "En cours", tone: "gold" },
  { value: "terminee", label: "Terminée", tone: "success" },
  { value: "annulee", label: "Annulée", tone: "danger" },
] as const;
export const missionStatusLabel = (v: string) => labelOf(MISSION_STATUSES, v);

export const DRIVER_STATUSES = [
  { value: "actif", label: "Actif", tone: "success" },
  { value: "indisponible", label: "Indisponible", tone: "warning" },
  { value: "inactif", label: "Inactif", tone: "muted" },
] as const;

export const MAINTENANCE_TYPES = [
  { value: "vidange", label: "Vidange" },
  { value: "revision", label: "Révision" },
  { value: "pneus", label: "Pneumatiques" },
  { value: "freins", label: "Freins" },
  { value: "visite_technique", label: "Visite technique" },
  { value: "assurance", label: "Renouvellement assurance" },
  { value: "reparation", label: "Réparation" },
  { value: "autre", label: "Autre" },
] as const;
export const maintenanceTypeLabel = (v: string) => labelOf(MAINTENANCE_TYPES, v);
export const MAINTENANCE_STATUSES = [
  { value: "planifie", label: "Planifié", tone: "info" },
  { value: "en_cours", label: "En cours", tone: "warning" },
  { value: "termine", label: "Terminé", tone: "success" },
  { value: "annule", label: "Annulé", tone: "muted" },
] as const;

export const SUBMISSION_STATUSES = [
  { value: "soumis", label: "Soumission reçue", tone: "gold" },
  { value: "en_revue", label: "En cours d'examen", tone: "info" },
  { value: "inspection", label: "Inspection planifiée", tone: "info" },
  { value: "proposition", label: "Proposition envoyée", tone: "warning" },
  { value: "contrat", label: "Contrat signé", tone: "success" },
  { value: "integre", label: "Intégré à la flotte", tone: "success" },
  { value: "suivi", label: "En exploitation", tone: "success" },
  { value: "refuse", label: "Non retenu", tone: "danger" },
] as const;
export const submissionStatusLabel = (v: string) => labelOf(SUBMISSION_STATUSES, v);

export const OWNER_STATUSES = [
  { value: "prospect", label: "Prospect", tone: "muted" },
  { value: "en_revue", label: "En revue", tone: "info" },
  { value: "actif", label: "Partenaire actif", tone: "success" },
  { value: "suspendu", label: "Suspendu", tone: "danger" },
] as const;

export const DOC_TYPES = [
  { value: "carte_grise", label: "Carte grise" },
  { value: "assurance", label: "Attestation d'assurance" },
  { value: "visite_technique", label: "Visite technique" },
  { value: "permis", label: "Permis de conduire" },
  { value: "piece_identite", label: "Pièce d'identité" },
  { value: "contrat", label: "Contrat" },
  { value: "photo", label: "Photo du véhicule" },
  { value: "autre", label: "Autre document" },
] as const;
export const docTypeLabel = (v: string) => labelOf(DOC_TYPES, v);
export const DOC_STATUSES = [
  { value: "en_attente", label: "En attente", tone: "warning" },
  { value: "valide", label: "Validé", tone: "success" },
  { value: "refuse", label: "Refusé", tone: "danger" },
] as const;

export const CONTRACT_TYPES = [
  { value: "client", label: "Contrat client" },
  { value: "corporate", label: "Contrat corporate" },
  { value: "proprietaire", label: "Partenariat propriétaire" },
] as const;
export const contractTypeLabel = (v: string) => labelOf(CONTRACT_TYPES, v);
export const CONTRACT_STATUSES = [
  { value: "brouillon", label: "Brouillon", tone: "muted" },
  { value: "envoye", label: "Envoyé pour signature", tone: "info" },
  { value: "signe", label: "Signé", tone: "success" },
  { value: "actif", label: "Actif", tone: "success" },
  { value: "termine", label: "Terminé", tone: "muted" },
  { value: "resilie", label: "Résilié", tone: "danger" },
] as const;

export const MESSAGE_STATUSES = [
  { value: "nouveau", label: "Nouveau", tone: "gold" },
  { value: "lu", label: "Lu", tone: "muted" },
  { value: "traite", label: "Traité", tone: "success" },
  { value: "archive", label: "Archivé", tone: "muted" },
] as const;

export const TESTIMONIAL_STATUSES = [
  { value: "en_attente", label: "En attente de validation", tone: "warning" },
  { value: "publie", label: "Publié", tone: "success" },
  { value: "refuse", label: "Refusé", tone: "danger" },
] as const;

export type Tone = "gold" | "muted" | "info" | "warning" | "success" | "danger";
export function toneOf(list: readonly { value: string; tone: string }[], value: string): Tone {
  return (list.find((o) => o.value === value)?.tone as Tone) ?? "muted";
}
export { labelOf };
