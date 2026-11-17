import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema, type DB } from "./db";
import type { CurrentUser } from "./auth";
import { can, type Permission } from "@/lib/permissions";

export const MAX_FILE_BYTES = 3.5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export function validateFile(file: File | null | undefined, opts: { imagesOnly?: boolean } = {}): string | null {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_FILE_BYTES) return `« ${file.name} » dépasse 3,5 Mo.`;
  const allowed = opts.imagesOnly ? ALLOWED.filter((m) => m.startsWith("image/")) : ALLOWED;
  if (!allowed.includes(file.type)) return `« ${file.name} » : format non accepté (${opts.imagesOnly ? "JPG, PNG ou WebP" : "JPG, PNG, WebP ou PDF"}).`;
  return null;
}

export async function storeFile(
  conn: DB | Tx,
  file: File,
  opts: { isPublic?: boolean; entityType?: string; entityId?: string; uploadedBy?: string | null },
): Promise<string> {
  const data = Buffer.from(await file.arrayBuffer());
  const [row] = await conn
    .insert(schema.files)
    .values({
      name: file.name.slice(0, 200) || "fichier",
      mime: file.type,
      size: data.length,
      data,
      isPublic: !!opts.isPublic,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      uploadedBy: opts.uploadedBy ?? null,
    })
    .returning({ id: schema.files.id });
  return row.id;
}

export const fileUrl = (id: string) => `/api/files/${id}`;

const ENTITY_PERMISSION: Record<string, Permission> = {
  owner_submission: "owners.manage",
  owner: "owners.manage",
  vehicle: "vehicles.manage",
  contract: "contracts.manage",
  driver: "drivers.manage",
  expense: "finance.manage",
  content: "content.manage",
};

export async function canReadFile(user: CurrentUser | null, file: { isPublic: boolean; entityType: string | null; entityId: string | null; uploadedBy: string | null }) {
  if (file.isPublic) return true;
  if (!user) return false;
  if (file.uploadedBy === user.id) return true;
  const perm = file.entityType ? ENTITY_PERMISSION[file.entityType] : undefined;
  if (perm && can(user.role, perm)) return true;
  if (user.role === "super_admin" || user.role === "admin") return true;

  if (user.role === "proprietaire" && file.entityId) {
    const db = await getDb();
    const [owner] = await db.select({ id: schema.owners.id }).from(schema.owners).where(eq(schema.owners.userId, user.id)).limit(1);
    if (!owner) return false;
    if (file.entityType === "owner_submission") {
      const [s] = await db
        .select({ id: schema.ownerSubmissions.id })
        .from(schema.ownerSubmissions)
        .where(and(eq(schema.ownerSubmissions.id, file.entityId), eq(schema.ownerSubmissions.ownerId, owner.id)))
        .limit(1);
      return !!s;
    }
    if (file.entityType === "contract") {
      const [c] = await db
        .select({ id: schema.contracts.id })
        .from(schema.contracts)
        .where(and(eq(schema.contracts.id, file.entityId), eq(schema.contracts.ownerId, owner.id), eq(schema.contracts.sharedWithParty, true)))
        .limit(1);
      return !!c;
    }
  }
  return false;
}
