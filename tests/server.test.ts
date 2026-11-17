import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));

import { eq } from "drizzle-orm";
import { getDb, schema, type DB } from "@/server/db";
import { nextReference } from "@/server/core";
import { seedAdmin, DEMO_PASSWORD } from "@/server/db/seed";
import { hashPassword, verifyPassword } from "@/server/password";
import { renderCommercialPdf } from "@/server/pdf";
import { DEFAULT_SETTINGS } from "@/lib/site-content";

let db: DB;

beforeAll(async () => {
  db = await getDb();
});

describe("mots de passe", () => {
  it("hache avec scrypt et vérifie", async () => {
    const h = await hashPassword("Secret#2026");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Secret#2026", h)).toBe(true);
    expect(await verifyPassword("mauvais", h)).toBe(false);
  });
});

describe("base locale", () => {
  it("applique les migrations et charge les comptes de démonstration", async () => {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, "client@demo.sentrajet.sn"));
    expect(u?.role).toBe("client");
    expect(await verifyPassword(DEMO_PASSWORD, u.passwordHash)).toBe(true);
  });

  it("numérote les références sans doublon", async () => {
    const a = await nextReference(db, "invoice");
    const b = await nextReference(db, "invoice");
    expect(a).toMatch(/^FAC-\d{4}-\d{5}$/);
    expect(Number(b.slice(-5))).toBe(Number(a.slice(-5)) + 1);
  });

  it("crée le super administrateur une seule fois depuis l'environnement", async () => {
    const env = { SEED_ADMIN_EMAIL: "Direction@Example.sn", SEED_ADMIN_PASSWORD: "Motdepasse#2026" } as unknown as NodeJS.ProcessEnv;
    expect(await seedAdmin(db, env)).toBe("direction@example.sn");
    expect(await seedAdmin(db, env)).toBeNull();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, "direction@example.sn"));
    expect(u.role).toBe("super_admin");
    expect(await seedAdmin(db, {} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe("PDF", () => {
  it("génère un devis PDF valide", async () => {
    const bytes = await renderCommercialPdf({
      kind: "DEVIS",
      number: "DEV-2026-00001",
      date: "2026-10-25",
      client: { name: "Awa Ndiaye", email: "awa@example.sn" },
      items: [{ label: "Transfert AIBD – Plateau", quantity: 1, unitPrice: 45000 }],
      subtotal: 45000,
      taxRate: 18,
      taxAmount: 8100,
      total: 53100,
      settings: DEFAULT_SETTINGS,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
