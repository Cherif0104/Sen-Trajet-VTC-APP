"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit } from "../core";
import { fileUrl, storeFile, validateFile } from "../files";
import { adminAction, bool, buttonAction, dateOrNull, int, oneOf, req, str, UserError } from "../admin/util";
import {
  COMMERCIAL_STATUSES,
  DRIVER_STATUSES,
  FUELS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  PUBLICATION_STATUSES,
  TECHNICAL_STATUSES,
  TRANSMISSIONS,
  WITH_DRIVER,
} from "@/lib/domain";
import { slugify } from "@/lib/format";

const revalidateCatalog = () => {
  revalidatePath("/vehicules", "layout");
  revalidatePath("/");
};

async function uniqueSlug(table: typeof schema.vehicles | typeof schema.categories | typeof schema.features, base: string, exceptId?: string | null) {
  const db = await getDb();
  const root = slugify(base) || "element";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(exceptId ? and(eq(table.slug, candidate), ne(table.id, exceptId)) : eq(table.slug, candidate))
      .limit(1);
    if (rows.length === 0) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/* ───────── Véhicules ───────── */

export const saveVehicle = adminAction("vehicles.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const brand = req(fd, "brand", "La marque");
  const model = req(fd, "model", "Le modèle");
  const priceDay = int(fd, "priceDay");
  const priceWeek = int(fd, "priceWeek");
  const priceMonth = int(fd, "priceMonth");
  const pricesValidated = bool(fd, "pricesValidated");
  if (pricesValidated && priceDay === null && priceWeek === null && priceMonth === null)
    throw new UserError("Renseignez au moins un tarif avant de le marquer comme validé.", { cause: "pricesValidated" });
  const publicationStatus = oneOf(fd, "publicationStatus", PUBLICATION_STATUSES, "brouillon");
  const year = int(fd, "year");
  if (year !== null && (year < 1980 || year > new Date().getFullYear() + 1)) throw new UserError("Année invalide.", { cause: "year" });
  const customFeatures = (str(fd, "customFeatures") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
  const featureIds = fd.getAll("features").map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v));
  const data = {
    brand,
    model,
    version: str(fd, "version"),
    categoryId: str(fd, "categoryId"),
    ownerId: str(fd, "ownerId"),
    year,
    transmission: str(fd, "transmission") ? oneOf(fd, "transmission", TRANSMISSIONS) : null,
    fuel: str(fd, "fuel") ? oneOf(fd, "fuel", FUELS) : null,
    seats: int(fd, "seats"),
    doors: int(fd, "doors"),
    luggage: str(fd, "luggage"),
    color: str(fd, "color"),
    plate: str(fd, "plate"),
    mileage: int(fd, "mileage"),
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    usages: str(fd, "usages"),
    priceDay,
    priceWeek,
    priceMonth,
    pricesValidated,
    withDriver: oneOf(fd, "withDriver", WITH_DRIVER, "sur_demande"),
    commercialStatus: oneOf(fd, "commercialStatus", COMMERCIAL_STATUSES, "sur_demande"),
    technicalStatus: oneOf(fd, "technicalStatus", TECHNICAL_STATUSES, "operationnel"),
    publicationStatus,
    featured: bool(fd, "featured"),
    customFeatures,
    updatedAt: new Date(),
  };
  const vehicleId = await db.transaction(async (tx) => {
    let vid = id;
    if (id) {
      await tx.update(schema.vehicles).set(data).where(eq(schema.vehicles.id, id));
    } else {
      const slug = await uniqueSlug(schema.vehicles, `${brand} ${model} ${data.version ?? ""}`);
      const [row] = await tx.insert(schema.vehicles).values({ ...data, slug }).returning({ id: schema.vehicles.id });
      vid = row.id;
    }
    await tx.delete(schema.vehicleFeatures).where(eq(schema.vehicleFeatures.vehicleId, vid!));
    if (featureIds.length) await tx.insert(schema.vehicleFeatures).values(featureIds.map((featureId) => ({ vehicleId: vid!, featureId })));
    return vid!;
  });
  await audit(user.id, id ? "vehicle.update" : "vehicle.create", "vehicle", vehicleId, { publicationStatus, pricesValidated });
  revalidateCatalog();
  revalidatePath(`/admin/vehicules/${vehicleId}`);
  if (!id) return { ok: true, message: "Véhicule créé. Ajoutez maintenant ses photos.", redirectTo: `/admin/vehicules/${vehicleId}` };
});

export const uploadVehicleImages = adminAction("vehicles.manage", async (user, fd) => {
  const db = await getDb();
  const vehicleId = req(fd, "vehicleId", "Le véhicule");
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) throw new UserError("Sélectionnez au moins une photo.", { cause: "images" });
  if (files.length > 8) throw new UserError("8 photos maximum par envoi.", { cause: "images" });
  for (const f of files) {
    const err = validateFile(f, { imagesOnly: true });
    if (err) throw new UserError(err, { cause: "images" });
  }
  const [v] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId)).limit(1);
  if (!v) throw new UserError("Véhicule introuvable.");
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${schema.vehicleImages.sortOrder}), 0)::int` })
    .from(schema.vehicleImages)
    .where(eq(schema.vehicleImages.vehicleId, vehicleId));
  await db.transaction(async (tx) => {
    let order = maxOrder;
    let firstUrl: string | null = null;
    for (const f of files) {
      const fid = await storeFile(tx, f, { isPublic: true, entityType: "vehicle", entityId: vehicleId, uploadedBy: user.id });
      const url = fileUrl(fid);
      firstUrl ??= url;
      await tx.insert(schema.vehicleImages).values({ vehicleId, url, alt: `${v.brand} ${v.model}`, sortOrder: ++order });
    }
    if (!v.coverImage && firstUrl) await tx.update(schema.vehicles).set({ coverImage: firstUrl }).where(eq(schema.vehicles.id, vehicleId));
  });
  await audit(user.id, "vehicle.images_add", "vehicle", vehicleId, { count: files.length });
  revalidateCatalog();
  revalidatePath(`/admin/vehicules/${vehicleId}`);
  return { ok: true, message: `${files.length} photo(s) ajoutée(s).` };
});

export const setVehicleCover = buttonAction("vehicles.manage", async (user, fd) => {
  const db = await getDb();
  const vehicleId = String(fd.get("vehicleId"));
  const url = String(fd.get("url"));
  const [img] = await db
    .select()
    .from(schema.vehicleImages)
    .where(and(eq(schema.vehicleImages.vehicleId, vehicleId), eq(schema.vehicleImages.url, url)))
    .limit(1);
  const [v] = await db.select({ cover: schema.vehicles.coverImage }).from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId));
  if (!img && v?.cover !== url) throw new UserError("Image introuvable.");
  await db.update(schema.vehicles).set({ coverImage: url, updatedAt: new Date() }).where(eq(schema.vehicles.id, vehicleId));
  await audit(user.id, "vehicle.cover", "vehicle", vehicleId);
  revalidateCatalog();
  revalidatePath(`/admin/vehicules/${vehicleId}`);
  return { ok: true, message: "Photo principale mise à jour." };
});

export const deleteVehicleImage = buttonAction("vehicles.manage", async (user, fd) => {
  const db = await getDb();
  const imageId = String(fd.get("imageId"));
  const [img] = await db.select().from(schema.vehicleImages).where(eq(schema.vehicleImages.id, imageId)).limit(1);
  if (!img) throw new UserError("Image introuvable.");
  await db.transaction(async (tx) => {
    await tx.delete(schema.vehicleImages).where(eq(schema.vehicleImages.id, imageId));
    const fileId = img.url.match(/^\/api\/files\/([0-9a-f-]{36})$/)?.[1];
    if (fileId) await tx.delete(schema.files).where(eq(schema.files.id, fileId));
    const [v] = await tx.select({ cover: schema.vehicles.coverImage }).from(schema.vehicles).where(eq(schema.vehicles.id, img.vehicleId));
    if (v?.cover === img.url) {
      const [next] = await tx.select({ url: schema.vehicleImages.url }).from(schema.vehicleImages).where(eq(schema.vehicleImages.vehicleId, img.vehicleId)).limit(1);
      await tx.update(schema.vehicles).set({ coverImage: next?.url ?? null }).where(eq(schema.vehicles.id, img.vehicleId));
    }
  });
  await audit(user.id, "vehicle.image_delete", "vehicle", img.vehicleId);
  revalidateCatalog();
  revalidatePath(`/admin/vehicules/${img.vehicleId}`);
  return { ok: true, message: "Photo supprimée." };
});

export const archiveVehicle = buttonAction("vehicles.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  await db.update(schema.vehicles).set({ publicationStatus: "archive", featured: false, updatedAt: new Date() }).where(eq(schema.vehicles.id, id));
  await audit(user.id, "vehicle.archive", "vehicle", id);
  revalidateCatalog();
  revalidatePath(`/admin/vehicules/${id}`);
  return { ok: true, message: "Véhicule archivé et retiré du site." };
});

/* ───────── Catégories & équipements ───────── */

export const saveCategory = adminAction("catalog.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const name = req(fd, "name", "Le nom");
  const data = {
    name,
    description: str(fd, "description"),
    sortOrder: int(fd, "sortOrder") ?? 0,
    isActive: id ? bool(fd, "isActive") : true,
  };
  const image = fd.get("image");
  let imageUrl: string | undefined;
  if (image instanceof File && image.size > 0) {
    const err = validateFile(image, { imagesOnly: true });
    if (err) throw new UserError(err, { cause: "image" });
    imageUrl = fileUrl(await storeFile(db, image, { isPublic: true, entityType: "content", uploadedBy: user.id }));
  }
  if (id) {
    await db.update(schema.categories).set({ ...data, ...(imageUrl ? { image: imageUrl } : {}) }).where(eq(schema.categories.id, id));
  } else {
    await db.insert(schema.categories).values({ ...data, slug: await uniqueSlug(schema.categories, name), image: imageUrl ?? null });
  }
  await audit(user.id, id ? "category.update" : "category.create", "category", id);
  revalidateCatalog();
  revalidatePath("/admin/categories");
  return { ok: true, message: id ? "Catégorie mise à jour." : "Catégorie créée." };
});

export const deleteCategory = buttonAction("catalog.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const used = await db.$count(schema.vehicles, eq(schema.vehicles.categoryId, id));
  if (used > 0) throw new UserError(`Cette catégorie est utilisée par ${used} véhicule(s). Désactivez-la plutôt.`);
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  await audit(user.id, "category.delete", "category", id);
  revalidateCatalog();
  revalidatePath("/admin/categories");
  return { ok: true, message: "Catégorie supprimée." };
});

export const saveFeature = adminAction("catalog.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const name = req(fd, "name", "Le nom");
  if (id) await db.update(schema.features).set({ name, sortOrder: int(fd, "sortOrder") ?? 0 }).where(eq(schema.features.id, id));
  else await db.insert(schema.features).values({ name, slug: await uniqueSlug(schema.features, name), sortOrder: int(fd, "sortOrder") ?? 0 });
  await audit(user.id, id ? "feature.update" : "feature.create", "feature", id);
  revalidateCatalog();
  revalidatePath("/admin/equipements");
  return { ok: true, message: id ? "Équipement mis à jour." : "Équipement ajouté." };
});

export const deleteFeature = buttonAction("catalog.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  await db.delete(schema.features).where(eq(schema.features.id, id));
  await audit(user.id, "feature.delete", "feature", id);
  revalidateCatalog();
  revalidatePath("/admin/equipements");
  return { ok: true, message: "Équipement supprimé." };
});

/* ───────── Maintenance ───────── */

export const saveMaintenance = adminAction("maintenance.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const status = oneOf(fd, "status", MAINTENANCE_STATUSES, "planifie");
  const data = {
    vehicleId: req(fd, "vehicleId", "Le véhicule"),
    type: oneOf(fd, "type", MAINTENANCE_TYPES),
    status,
    scheduledDate: dateOrNull(fd, "scheduledDate"),
    dueMileage: int(fd, "dueMileage"),
    completedDate: dateOrNull(fd, "completedDate") ?? (status === "termine" ? new Date().toISOString().slice(0, 10) : null),
    cost: int(fd, "cost"),
    provider: str(fd, "provider"),
    notes: str(fd, "notes"),
  };
  if (!data.scheduledDate && data.dueMileage === null) throw new UserError("Indiquez une date prévue ou un kilométrage d'échéance.", { cause: "scheduledDate" });
  let mid = id;
  if (id) await db.update(schema.maintenance).set(data).where(eq(schema.maintenance.id, id));
  else mid = (await db.insert(schema.maintenance).values(data).returning({ id: schema.maintenance.id }))[0].id;
  if (bool(fd, "updateVehicleStatus")) {
    const technicalStatus = status === "en_cours" ? "en_maintenance" : status === "termine" ? "operationnel" : undefined;
    if (technicalStatus) await db.update(schema.vehicles).set({ technicalStatus, updatedAt: new Date() }).where(eq(schema.vehicles.id, data.vehicleId));
  }
  await audit(user.id, id ? "maintenance.update" : "maintenance.create", "maintenance", mid);
  revalidatePath("/admin/maintenance");
  return { ok: true, message: "Intervention enregistrée." };
});

export const deleteMaintenance = buttonAction("maintenance.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  await db.delete(schema.maintenance).where(eq(schema.maintenance.id, id));
  await audit(user.id, "maintenance.delete", "maintenance", id);
  revalidatePath("/admin/maintenance");
  return { ok: true, message: "Intervention supprimée." };
});

/* ───────── Chauffeurs ───────── */

export const saveDriver = adminAction("drivers.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const email = str(fd, "email")?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("E-mail invalide.", { cause: "email" });
  let userId: string | null = null;
  if (email) {
    const [u] = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (u && u.role === "chauffeur") userId = u.id;
  }
  const data = {
    fullName: req(fd, "fullName", "Le nom"),
    phone: str(fd, "phone"),
    email,
    licenseNumber: str(fd, "licenseNumber"),
    licenseExpiry: dateOrNull(fd, "licenseExpiry"),
    languages: str(fd, "languages"),
    status: oneOf(fd, "status", DRIVER_STATUSES, "actif"),
    notes: str(fd, "notes"),
    userId,
    updatedAt: new Date(),
  };
  if (userId) {
    const clash = await db
      .select({ id: schema.drivers.id })
      .from(schema.drivers)
      .where(id ? and(eq(schema.drivers.userId, userId), ne(schema.drivers.id, id)) : eq(schema.drivers.userId, userId))
      .limit(1);
    if (clash.length) throw new UserError("Ce compte chauffeur est déjà rattaché à une autre fiche.", { cause: "email" });
  }
  let did = id;
  if (id) await db.update(schema.drivers).set(data).where(eq(schema.drivers.id, id));
  else did = (await db.insert(schema.drivers).values(data).returning({ id: schema.drivers.id }))[0].id;
  await audit(user.id, id ? "driver.update" : "driver.create", "driver", did);
  revalidatePath("/admin/chauffeurs");
  return {
    ok: true,
    message: email && !userId ? "Fiche enregistrée. Aucun compte chauffeur n'existe encore pour cet e-mail : créez-le dans « Utilisateurs & rôles »." : "Fiche chauffeur enregistrée.",
    redirectTo: id ? undefined : `/admin/chauffeurs/${did}`,
  };
});
