import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LineItem } from "./db/schema";
import type { SiteSettings } from "@/lib/site-content";

const GOLD = rgb(0.788, 0.604, 0.196);
const INK = rgb(0.031, 0.031, 0.031);
const GREY = rgb(0.38, 0.38, 0.38);
const LIGHT = rgb(0.96, 0.96, 0.96);

/** Les polices standard PDF ne couvrent que WinAnsi : on normalise les caractères hors jeu. */
function t(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[\u202f\u00a0]/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/[^\x20-\x7E\u00A0-\u00FF€]/g, "");
}

const money = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/[\u202f\u00a0]/g, " ")} FCFA`;

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of t(text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export type PdfDocInput = {
  kind: "DEVIS" | "FACTURE";
  number: string;
  date: string;
  secondaryDate?: { label: string; value: string };
  reference?: string | null;
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null; address?: string | null };
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid?: number;
  notes?: string | null;
  settings: SiteSettings;
};

export async function renderCommercialPdf(input: PdfDocInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${input.kind} ${input.number}`);
  pdf.setAuthor("SENTRAJET PREMIUM — IMPULCIA AFRIQUE");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const M = 48;

  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: INK });
  page.drawText("SENTRAJET", { x: M, y: height - 52, size: 22, font: bold, color: GOLD });
  page.drawText("PREMIUM", { x: M, y: height - 68, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText(t("Executive Chauffeur & Mobility Services"), { x: M, y: height - 82, size: 8, font, color: rgb(0.75, 0.75, 0.75) });
  const c = input.settings.company;
  const companyLines = [c.legalName, [c.address, c.city, "Sénégal"].filter(Boolean).join(", "), c.phone, c.email, c.ninea ? `NINEA ${c.ninea}` : "", c.rccm ? `RCCM ${c.rccm}` : ""].filter(Boolean);
  companyLines.forEach((l, i) => {
    const s = t(l);
    page.drawText(s, { x: width - M - font.widthOfTextAtSize(s, 8), y: height - 30 - i * 11, size: 8, font, color: rgb(0.85, 0.85, 0.85) });
  });

  let y = height - 140;
  page.drawText(input.kind, { x: M, y, size: 24, font: bold, color: INK });
  page.drawText(t(`N° ${input.number}`), { x: M, y: y - 20, size: 11, font: bold, color: GOLD });
  const meta = [`Date : ${input.date}`, input.secondaryDate ? `${input.secondaryDate.label} : ${input.secondaryDate.value}` : "", input.reference ? `Demande : ${input.reference}` : ""].filter(Boolean);
  meta.forEach((m, i) => page.drawText(t(m), { x: M, y: y - 38 - i * 13, size: 9, font, color: GREY }));

  const bx = width / 2 + 10;
  page.drawRectangle({ x: bx, y: y - 72, width: width - M - bx, height: 86, color: LIGHT });
  page.drawText("CLIENT", { x: bx + 12, y: y - 2, size: 8, font: bold, color: GOLD });
  [input.client.company, input.client.name, input.client.address, input.client.email, input.client.phone]
    .filter(Boolean)
    .slice(0, 5)
    .forEach((l, i) => page.drawText(t(l!), { x: bx + 12, y: y - 18 - i * 12, size: i === 0 ? 10 : 9, font: i === 0 ? bold : font, color: INK }));

  y -= 110;
  const cols = { label: M + 8, qty: width - M - 220, unit: width - M - 150, total: width - M - 8 };
  const header = () => {
    page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 22, color: INK });
    page.drawText(t("Désignation"), { x: cols.label, y, size: 9, font: bold, color: GOLD });
    page.drawText(t("Qté"), { x: cols.qty, y, size: 9, font: bold, color: GOLD });
    page.drawText("Prix unitaire HT", { x: cols.unit - 20, y, size: 9, font: bold, color: GOLD });
    const tl = "Total HT";
    page.drawText(tl, { x: cols.total - bold.widthOfTextAtSize(tl, 9), y, size: 9, font: bold, color: GOLD });
    y -= 26;
  };
  header();
  for (const item of input.items) {
    const lines = wrap(item.label, font, 9, cols.qty - cols.label - 12);
    const rowH = Math.max(18, lines.length * 12 + 6);
    if (y - rowH < 140) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - 60;
      header();
    }
    lines.forEach((l, i) => page.drawText(l, { x: cols.label, y: y - i * 12, size: 9, font, color: INK }));
    page.drawText(String(item.quantity), { x: cols.qty, y, size: 9, font, color: INK });
    const u = money(item.unitPrice);
    page.drawText(u, { x: cols.unit + 60 - font.widthOfTextAtSize(u, 9), y, size: 9, font, color: INK });
    const tot = money(Math.round(item.quantity * item.unitPrice));
    page.drawText(tot, { x: cols.total - font.widthOfTextAtSize(tot, 9), y, size: 9, font, color: INK });
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: width - M, y: y + 8 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) });
  }

  y -= 10;
  const totals: [string, string, boolean][] = [
    ["Total HT", money(input.subtotal), false],
    [`TVA (${input.taxRate} %)`, money(input.taxAmount), false],
    ["Total TTC", money(input.total), true],
  ];
  if (input.amountPaid !== undefined && input.amountPaid > 0) {
    totals.push(["Déjà réglé", money(input.amountPaid), false], ["Reste à payer", money(Math.max(input.total - input.amountPaid, 0)), true]);
  }
  for (const [label, value, strong] of totals) {
    const f = strong ? bold : font;
    page.drawText(t(label), { x: width - M - 200, y, size: strong ? 11 : 9, font: f, color: INK });
    page.drawText(t(value), { x: width - M - 8 - f.widthOfTextAtSize(t(value), strong ? 11 : 9), y, size: strong ? 11 : 9, font: f, color: strong ? GOLD : INK });
    y -= strong ? 20 : 15;
  }

  const notes = [input.notes, input.settings.finance.paymentTerms ? `Conditions de paiement : ${input.settings.finance.paymentTerms}` : ""].filter(Boolean).join("\n");
  if (notes) {
    y -= 10;
    page.drawText("Notes", { x: M, y, size: 9, font: bold, color: GOLD });
    y -= 14;
    for (const l of wrap(notes, font, 9, width - 2 * M)) {
      if (y < 70) break;
      page.drawText(l, { x: M, y, size: 9, font, color: GREY });
      y -= 12;
    }
  }

  for (const p of pdf.getPages()) {
    p.drawLine({ start: { x: M, y: 48 }, end: { x: width - M, y: 48 }, thickness: 0.5, color: GOLD });
    const foot = t(`${c.legalName} - SENTRAJET PREMIUM - ${c.phone}`);
    p.drawText(foot, { x: (width - font.widthOfTextAtSize(foot, 7.5)) / 2, y: 34, size: 7.5, font, color: GREY });
  }
  return pdf.save();
}
