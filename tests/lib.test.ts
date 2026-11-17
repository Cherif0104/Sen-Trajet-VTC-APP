import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { can, homeFor, isStaff, ROLE_PERMISSIONS, PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions";
import { computeTotals } from "@/lib/totals";
import { fcfa, slugify } from "@/lib/format";

describe("permissions", () => {
  it("donne tous les droits au super administrateur", () => {
    for (const p of PERMISSIONS) expect(can("super_admin", p)).toBe(true);
  });

  it("cloisonne les rôles métiers", () => {
    expect(can("commercial", "finance.manage")).toBe(false);
    expect(can("commercial", "users.manage")).toBe(false);
    expect(can("flotte", "invoices.manage")).toBe(false);
    expect(can("financier", "vehicles.manage")).toBe(false);
    expect(can("financier", "audit.view")).toBe(false);
  });

  it("ne donne aucun droit back-office aux comptes externes", () => {
    for (const role of ["client", "proprietaire", "chauffeur"] as const) {
      expect(ROLE_PERMISSIONS[role]).toEqual([]);
      expect(isStaff(role)).toBe(false);
    }
    expect(can(null, "dashboard.view")).toBe(false);
    expect(can("inconnu", "dashboard.view")).toBe(false);
  });

  it("oriente chaque rôle vers son espace", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("client")).toBe("/espace");
    expect(homeFor("proprietaire")).toBe("/proprietaire");
    expect(homeFor("chauffeur")).toBe("/chauffeur");
  });

  it("libelle chaque permission", () => {
    for (const p of PERMISSIONS) expect(PERMISSION_LABELS[p]).toBeTruthy();
  });
});

describe("totaux", () => {
  it("calcule HT, TVA et TTC en FCFA entiers", () => {
    expect(computeTotals([{ quantity: 2, unitPrice: 75000 }, { quantity: 1, unitPrice: 60000 }], 18)).toEqual({
      subtotal: 210000,
      taxAmount: 37800,
      total: 247800,
    });
    expect(computeTotals([], 18)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
    expect(computeTotals([{ quantity: 1, unitPrice: 1001 }], 0).total).toBe(1001);
  });
});

describe("export CSV", () => {
  it("neutralise les formules et échappe les séparateurs", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell('Dakar; "Plateau"')).toBe('"Dakar; ""Plateau"""');
    expect(csvCell(null)).toBe("");
  });

  it("produit un fichier lisible par Excel", () => {
    const out = toCsv(["a", "b"], [[1, "x"]]);
    expect(out.startsWith("\uFEFF")).toBe(true);
    expect(out).toBe("\uFEFFa;b\r\n1;x");
  });
});

describe("format", () => {
  it("affiche les montants en FCFA", () => {
    expect(fcfa(150000).replace(/\s/g, " ")).toMatch(/150 000 FCFA/);
  });
  it("génère des slugs sans accents", () => {
    expect(slugify("Mercedes Classe É 2024")).toBe("mercedes-classe-e-2024");
  });
});
