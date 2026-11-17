import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";
import type { DB } from "./index";
import { hashPassword } from "../password";

const CATEGORIES = [
  { slug: "berlines", name: "Berlines", description: "Confort et élégance pour vos déplacements urbains et professionnels.", image: "/images/ford-fusion.webp" },
  { slug: "pick-up", name: "Pick-up", description: "Robustes et polyvalents, idéals pour les missions terrain et les pistes.", image: "/images/toyota-hilux.webp" },
  { slug: "minibus", name: "Minibus", description: "Transport de groupes, navettes et délégations.", image: "/images/toyota-hiace.webp" },
  { slug: "suv-4x4", name: "SUV / 4x4", description: "Espace, hauteur de conduite et confort sur tous les terrains.", image: "/images/interurbain.webp" },
  { slug: "premium", name: "Premium", description: "Véhicules haut de gamme pour vos clients et rendez-vous importants.", image: "/images/hero-sentrajet.webp" },
  { slug: "utilitaires", name: "Utilitaires", description: "Transport de matériel et logistique.", image: "/images/mission-terrain.webp" },
];

const FEATURES = [
  ["climatisation", "Climatisation", "snowflake"],
  ["gps", "GPS", "map-pin"],
  ["bluetooth", "Bluetooth", "bluetooth"],
  ["camera-recul", "Caméra de recul", "camera"],
  ["capteurs-stationnement", "Capteurs de stationnement", "radar"],
  ["abs", "ABS", "disc"],
  ["airbags", "Airbags", "shield"],
  ["vitres-electriques", "Vitres électriques", "panel-top"],
  ["sieges-cuir", "Sièges en cuir", "armchair"],
  ["ports-usb", "Ports USB", "usb"],
  ["chauffeur-disponible", "Chauffeur disponible", "user-round"],
  ["non-fumeur", "Véhicule non-fumeur", "cigarette-off"],
] as const;

const VEHICLES = [
  {
    slug: "toyota-hilux",
    brand: "Toyota",
    model: "Hilux",
    category: "pick-up",
    cover: "/images/toyota-hilux.webp",
    short: "Le pick-up de référence pour les missions terrain, chantiers et déplacements en régions.",
    usages: "Missions terrain, ONG et projets, chantiers, voyages en régions",
  },
  {
    slug: "toyota-hiace",
    brand: "Toyota",
    model: "Hiace",
    category: "minibus",
    cover: "/images/toyota-hiace.webp",
    short: "Le minibus idéal pour les groupes, séminaires, navettes et délégations.",
    usages: "Transport de groupes, séminaires, mariages, navettes aéroport",
  },
  {
    slug: "toyota-yaris",
    brand: "Toyota",
    model: "Yaris",
    category: "berlines",
    cover: "/images/toyota-yaris.webp",
    short: "Compacte, économique et agréable pour vos déplacements urbains à Dakar.",
    usages: "Déplacements urbains, rendez-vous, courses du quotidien",
  },
  {
    slug: "ford-fusion",
    brand: "Ford",
    model: "Fusion",
    category: "berlines",
    cover: "/images/ford-fusion.webp",
    short: "Une berline spacieuse et confortable pour vos déplacements professionnels.",
    usages: "Rendez-vous d'affaires, transferts aéroport, accueil de partenaires",
  },
];

/** Données de référence, sûres en production : idempotent, n'écrase jamais l'existant. */
export async function seedBase(db: DB) {
  const [{ count: catCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.categories);
  if (catCount === 0) {
    await db.insert(schema.categories).values(CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })));
  }
  const [{ count: featCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.features);
  if (featCount === 0) {
    await db.insert(schema.features).values(FEATURES.map(([slug, name, icon], i) => ({ slug, name, icon, sortOrder: i })));
  }
  const [{ count: vehCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.vehicles);
  if (vehCount === 0) {
    const cats = await db.select().from(schema.categories);
    const feats = await db.select().from(schema.features);
    const driverFeature = feats.find((f) => f.slug === "chauffeur-disponible");
    for (const [i, v] of VEHICLES.entries()) {
      const [row] = await db
        .insert(schema.vehicles)
        .values({
          slug: v.slug,
          brand: v.brand,
          model: v.model,
          categoryId: cats.find((c) => c.slug === v.category)?.id ?? null,
          shortDescription: v.short,
          usages: v.usages,
          coverImage: v.cover,
          withDriver: "sur_demande",
          commercialStatus: "sur_demande",
          technicalStatus: "operationnel",
          publicationStatus: "publie",
          featured: i < 4,
        })
        .returning({ id: schema.vehicles.id });
      await db.insert(schema.vehicleImages).values({ vehicleId: row.id, url: v.cover, alt: `${v.brand} ${v.model}`, sortOrder: 0 });
      if (driverFeature) await db.insert(schema.vehicleFeatures).values({ vehicleId: row.id, featureId: driverFeature.id });
    }
  }
}

/** Crée le super administrateur à partir des variables d'environnement, s'il n'existe pas déjà. */
export async function seedAdmin(db: DB, env: NodeJS.ProcessEnv = process.env) {
  const email = env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return null;
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing[0]) return null;
  await db.insert(schema.users).values({
    email,
    passwordHash: await hashPassword(password),
    fullName: env.SEED_ADMIN_NAME?.trim() || "Super administrateur",
    role: "super_admin",
  });
  return email;
}

export const DEMO_PASSWORD = "Demo2026!";

/** Données de démonstration : uniquement pour le poste local (PGlite), jamais en production. */
export async function seedDemo(db: DB) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users);
  if (count > 0) return;
  const pw = await hashPassword(DEMO_PASSWORD);
  const mk = (email: string, fullName: string, role: string, extra: Partial<typeof schema.users.$inferInsert> = {}) => ({
    email,
    fullName,
    role,
    passwordHash: pw,
    phone: "+221 70 000 00 00",
    ...extra,
  });
  const users = await db
    .insert(schema.users)
    .values([
      mk("admin@demo.sentrajet.sn", "Awa Diop (démo)", "super_admin"),
      mk("commercial@demo.sentrajet.sn", "Moussa Fall (démo)", "commercial"),
      mk("flotte@demo.sentrajet.sn", "Ibrahima Ndiaye (démo)", "flotte"),
      mk("finance@demo.sentrajet.sn", "Fatou Sarr (démo)", "financier"),
      mk("client@demo.sentrajet.sn", "Cheikh Ba (démo)", "client"),
      mk("entreprise@demo.sentrajet.sn", "Aminata Sow (démo)", "client", { accountType: "entreprise", companyName: "Société Démo SARL", jobTitle: "Responsable logistique" }),
      mk("proprietaire@demo.sentrajet.sn", "Ousmane Diallo (démo)", "proprietaire"),
      mk("chauffeur@demo.sentrajet.sn", "Mamadou Gueye (démo)", "chauffeur"),
    ])
    .returning();
  const byEmail = (e: string) => users.find((u) => u.email === e)!;
  const client = byEmail("client@demo.sentrajet.sn");
  const corp = byEmail("entreprise@demo.sentrajet.sn");
  const ownerUser = byEmail("proprietaire@demo.sentrajet.sn");
  const driverUser = byEmail("chauffeur@demo.sentrajet.sn");
  const admin = byEmail("admin@demo.sentrajet.sn");

  const [c1, c2] = await db
    .insert(schema.customers)
    .values([
      { userId: client.id, fullName: client.fullName, email: client.email, phone: client.phone, type: "particulier", source: "espace_client" },
      { userId: corp.id, fullName: corp.fullName, email: corp.email, phone: corp.phone, type: "entreprise", companyName: corp.companyName, source: "espace_client" },
    ])
    .returning();

  const vehicles = await db.select().from(schema.vehicles);
  const hilux = vehicles.find((v) => v.slug === "toyota-hilux")!;
  const hiace = vehicles.find((v) => v.slug === "toyota-hiace")!;
  const year = new Date().getFullYear();
  const day = (offset: number) => new Date(Date.now() + offset * 86400_000).toISOString().slice(0, 10);

  const reqs = await db
    .insert(schema.requests)
    .values([
      {
        reference: `STP-${year}-00001`,
        kind: "reservation",
        serviceType: "location_chauffeur",
        vehicleId: vehicles.find((v) => v.slug === "ford-fusion")!.id,
        startDate: day(3),
        startTime: "08:00",
        endDate: day(3),
        endTime: "18:00",
        pickup: "Aéroport AIBD",
        destination: "Plateau, Dakar",
        passengers: 2,
        withDriver: true,
        contactName: client.fullName,
        email: client.email,
        phone: client.phone!,
        customerId: c1.id,
        userId: client.id,
        status: "nouvelle",
      },
      {
        reference: `STP-${year}-00002`,
        kind: "devis",
        serviceType: "groupes",
        vehicleId: hiace.id,
        startDate: day(10),
        startTime: "07:30",
        pickup: "Almadies, Dakar",
        destination: "Centre international de conférences, Diamniadio",
        passengers: 14,
        duration: "3 jours",
        withDriver: true,
        details: "Navette quotidienne pour un séminaire.",
        contactName: corp.fullName,
        email: corp.email,
        phone: corp.phone!,
        accountType: "entreprise",
        companyName: corp.companyName,
        customerId: c2.id,
        userId: corp.id,
        status: "devis_envoye",
      },
      {
        reference: `STP-${year}-00003`,
        kind: "reservation",
        serviceType: "mission_terrain",
        vehicleId: hilux.id,
        startDate: day(-5),
        endDate: day(-2),
        pickup: "Dakar",
        destination: "Kédougou",
        passengers: 3,
        withDriver: true,
        contactName: corp.fullName,
        email: corp.email,
        phone: corp.phone!,
        accountType: "entreprise",
        companyName: corp.companyName,
        customerId: c2.id,
        userId: corp.id,
        status: "terminee",
      },
    ])
    .returning();
  await db.insert(schema.requestHistory).values(
    reqs.flatMap((r) => [
      { requestId: r.id, fromStatus: null, toStatus: "nouvelle", note: "Demande créée (données de démonstration)" },
      ...(r.status !== "nouvelle" ? [{ requestId: r.id, fromStatus: "nouvelle", toStatus: r.status, byUserId: admin.id }] : []),
    ]),
  );
  await db.insert(schema.counters).values({ key: "request", year, value: 3 });

  const items = [{ label: "Minibus avec chauffeur — 3 jours (démo)", quantity: 3, unitPrice: 100000 }];
  await db
    .insert(schema.quotes)
    .values({
      number: `DEV-${year}-00001`,
      requestId: reqs[1].id,
      customerId: c2.id,
      status: "envoye",
      items,
      subtotal: 300000,
      taxRate: 18,
      taxAmount: 54000,
      total: 354000,
      validUntil: day(15),
      sentAt: new Date(),
      createdBy: admin.id,
    });
  await db.insert(schema.counters).values({ key: "quote", year, value: 1 });

  const [inv] = await db
    .insert(schema.invoices)
    .values({
      number: `FAC-${year}-00001`,
      customerId: c2.id,
      requestId: reqs[2].id,
      status: "partielle",
      items: [{ label: "Mission terrain Dakar – Kédougou, pick-up avec chauffeur (démo)", quantity: 4, unitPrice: 75000 }],
      subtotal: 300000,
      taxRate: 18,
      taxAmount: 54000,
      total: 354000,
      amountPaid: 200000,
      issuedAt: day(-2),
      dueAt: day(28),
      createdBy: admin.id,
    })
    .returning();
  await db.insert(schema.counters).values({ key: "invoice", year, value: 1 });
  await db.insert(schema.payments).values({ invoiceId: inv.id, amount: 200000, method: "wave", paidAt: day(-1), direction: "encaissement", createdBy: admin.id });
  await db.insert(schema.expenses).values([
    { category: "carburant", vehicleId: hilux.id, label: "Carburant mission Kédougou (démo)", amountHt: 85000, taxAmount: 0, amountTtc: 85000, spentAt: day(-4) },
    { category: "peage", vehicleId: hilux.id, label: "Péage autoroute (démo)", amountHt: 6000, taxAmount: 0, amountTtc: 6000, spentAt: day(-5) },
  ]);

  const [driver] = await db
    .insert(schema.drivers)
    .values({ userId: driverUser.id, fullName: driverUser.fullName, phone: driverUser.phone, email: driverUser.email, licenseNumber: "DEMO-0001", licenseExpiry: day(400), languages: "Français, Wolof" })
    .returning();
  await db.insert(schema.missions).values({
    reference: `MIS-${year}-00001`,
    requestId: reqs[2].id,
    customerId: c2.id,
    vehicleId: hilux.id,
    driverId: driver.id,
    startAt: new Date(day(-5)),
    endAt: new Date(day(-2)),
    pickup: "Dakar",
    destination: "Kédougou",
    status: "terminee",
  });
  await db.insert(schema.counters).values({ key: "mission", year, value: 1 });
  await db.insert(schema.maintenance).values([
    { vehicleId: hilux.id, type: "vidange", status: "planifie", scheduledDate: day(6), notes: "Après la mission Kédougou (démo)" },
    { vehicleId: hiace.id, type: "visite_technique", status: "planifie", scheduledDate: day(-1) },
  ]);

  const [owner] = await db
    .insert(schema.owners)
    .values({ userId: ownerUser.id, fullName: ownerUser.fullName, email: ownerUser.email, phone: ownerUser.phone, status: "en_revue" })
    .returning();
  const [sub] = await db
    .insert(schema.ownerSubmissions)
    .values({
      reference: `PRO-${year}-00001`,
      ownerId: owner.id,
      brand: "Toyota",
      model: "Land Cruiser Prado",
      year: 2019,
      mileage: 98000,
      condition: "Bon état général, entretien suivi (démo)",
      availability: "Disponible en semaine",
      status: "en_revue",
    })
    .returning();
  await db.insert(schema.submissionHistory).values([
    { submissionId: sub.id, toStatus: "soumis", note: "Soumission en ligne" },
    { submissionId: sub.id, fromStatus: "soumis", toStatus: "en_revue", byUserId: admin.id },
  ]);
  await db.insert(schema.counters).values({ key: "submission", year, value: 1 });

  await db.insert(schema.testimonials).values({
    authorName: "Client démo",
    content: "Témoignage de démonstration, visible uniquement en environnement local.",
    rating: 5,
    status: "en_attente",
  });
  await db.insert(schema.messages).values({
    name: "Visiteur démo",
    email: "visiteur@demo.sentrajet.sn",
    subject: "Disponibilité d'un minibus",
    body: "Bonjour, avez-vous un minibus disponible le mois prochain ? (démo)",
  });
}
