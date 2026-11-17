import type { MetadataRoute } from "next";
import { SERVICES } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";
import { listPublishedVehicles } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = ["", "/prestations", "/vehicules", "/reservation", "/devenir-proprietaire", "/a-propos", "/partenaires", "/faq", "/contact", "/mentions-legales", "/confidentialite", "/cgv"];
  let vehicles: { slug: string }[] = [];
  try {
    vehicles = await listPublishedVehicles();
  } catch {}
  return [
    ...staticPaths.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...SERVICES.map((s) => ({ url: `${SITE_URL}/prestations/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...vehicles.map((v) => ({ url: `${SITE_URL}/vehicules/${v.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
