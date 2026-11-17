import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "../db";

const { vehicles, categories, features, vehicleFeatures, vehicleImages } = schema;

export type PublicVehicle = Awaited<ReturnType<typeof listPublishedVehicles>>[number];

export async function listCategories(activeOnly = true) {
  const db = await getDb();
  return db
    .select()
    .from(categories)
    .where(activeOnly ? eq(categories.isActive, true) : undefined)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listFeatures() {
  const db = await getDb();
  return db.select().from(features).orderBy(asc(features.sortOrder), asc(features.name));
}

export async function listPublishedVehicles(filters: {
  category?: string;
  q?: string;
  seats?: number;
  transmission?: string;
  fuel?: string;
  driver?: string;
  featured?: boolean;
  limit?: number;
} = {}) {
  const db = await getDb();
  const where: SQL[] = [eq(vehicles.publicationStatus, "publie")];
  if (filters.category) where.push(eq(categories.slug, filters.category));
  if (filters.q) {
    const q = `%${filters.q}%`;
    where.push(or(ilike(vehicles.brand, q), ilike(vehicles.model, q), ilike(vehicles.shortDescription, q))!);
  }
  if (filters.seats) where.push(sql`${vehicles.seats} >= ${filters.seats}`);
  if (filters.transmission) where.push(eq(vehicles.transmission, filters.transmission));
  if (filters.fuel) where.push(eq(vehicles.fuel, filters.fuel));
  if (filters.driver === "avec") where.push(inArray(vehicles.withDriver, ["inclus", "sur_demande"]));
  if (filters.driver === "sans") where.push(inArray(vehicles.withDriver, ["sans", "sur_demande"]));
  if (filters.featured) where.push(eq(vehicles.featured, true));

  return db
    .select({
      id: vehicles.id,
      slug: vehicles.slug,
      brand: vehicles.brand,
      model: vehicles.model,
      version: vehicles.version,
      year: vehicles.year,
      seats: vehicles.seats,
      transmission: vehicles.transmission,
      fuel: vehicles.fuel,
      shortDescription: vehicles.shortDescription,
      coverImage: vehicles.coverImage,
      priceDay: vehicles.priceDay,
      pricesValidated: vehicles.pricesValidated,
      withDriver: vehicles.withDriver,
      commercialStatus: vehicles.commercialStatus,
      categoryId: vehicles.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(vehicles)
    .leftJoin(categories, eq(categories.id, vehicles.categoryId))
    .where(and(...where))
    .orderBy(desc(vehicles.featured), asc(categories.sortOrder), asc(vehicles.brand), asc(vehicles.model))
    .limit(filters.limit ?? 200);
}

export async function getPublishedVehicle(slug: string) {
  const db = await getDb();
  const [v] = await db
    .select({ vehicle: vehicles, category: categories })
    .from(vehicles)
    .leftJoin(categories, eq(categories.id, vehicles.categoryId))
    .where(and(eq(vehicles.slug, slug), eq(vehicles.publicationStatus, "publie")))
    .limit(1);
  if (!v) return null;
  const [images, feats] = await Promise.all([
    db.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, v.vehicle.id)).orderBy(asc(vehicleImages.sortOrder)),
    db
      .select({ id: features.id, name: features.name, icon: features.icon })
      .from(vehicleFeatures)
      .innerJoin(features, eq(features.id, vehicleFeatures.featureId))
      .where(eq(vehicleFeatures.vehicleId, v.vehicle.id))
      .orderBy(asc(features.sortOrder)),
  ]);
  return { ...v.vehicle, category: v.category, images, features: feats };
}

export async function listPublishedPartners() {
  const db = await getDb();
  return db
    .select()
    .from(schema.partners)
    .where(and(eq(schema.partners.isPublished, true), eq(schema.partners.authorizationConfirmed, true)))
    .orderBy(asc(schema.partners.sortOrder), asc(schema.partners.name));
}

export async function listPublishedTestimonials(limit = 6) {
  const db = await getDb();
  return db
    .select()
    .from(schema.testimonials)
    .where(eq(schema.testimonials.status, "publie"))
    .orderBy(desc(schema.testimonials.createdAt))
    .limit(limit);
}
