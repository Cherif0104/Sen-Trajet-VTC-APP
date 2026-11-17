import "server-only";
import { cache } from "react";
import { getDb, schema } from "./db";
import { mergeSettings, type SiteSettings } from "@/lib/site-content";

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const db = await getDb();
  const rows = await db.select({ key: schema.settings.key, value: schema.settings.value }).from(schema.settings);
  return mergeSettings(rows);
});
