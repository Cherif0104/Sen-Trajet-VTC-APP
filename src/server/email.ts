import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

/**
 * Envoie un e-mail de la file. Sans RESEND_API_KEY, l'e-mail reste consultable
 * dans le back-office (statut « simulé ») et aucun envoi externe n'est tenté.
 */
export async function sendQueuedEmail(id: string) {
  const db = await getDb();
  const [mail] = await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.id, id)).limit(1);
  if (!mail || mail.status === "envoye") return;

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    await db.update(schema.emailOutbox).set({ status: "simule" }).where(eq(schema.emailOutbox.id, id));
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: mail.to.split(","), subject: mail.subject, html: mail.html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await db.update(schema.emailOutbox).set({ status: "envoye", sentAt: new Date(), error: null }).where(eq(schema.emailOutbox.id, id));
  } catch (e) {
    await db
      .update(schema.emailOutbox)
      .set({ status: "echec", error: e instanceof Error ? e.message : String(e) })
      .where(eq(schema.emailOutbox.id, id));
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailLayout(title: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#252525">${esc(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#C99A32;color:#080808;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#080808;padding:22px 28px;color:#E7C46A;font-weight:700;letter-spacing:3px;font-size:14px">SENTRAJET PREMIUM</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 18px;font-size:20px;color:#080808">${esc(title)}</h1>${body}${button}</td></tr>
<tr><td style="padding:18px 28px;background:#F5F5F5;color:#6b6b6b;font-size:12px">IMPULCIA AFRIQUE · SENTRAJET PREMIUM · Executive Chauffeur &amp; Mobility Services · +221 78 832 40 69</td></tr>
</table></td></tr></table></body></html>`;
}
