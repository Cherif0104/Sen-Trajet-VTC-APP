import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { canReadFile } from "@/server/files";

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Introuvable", { status: 404 });
  const db = await getDb();
  const [file] = await db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
  if (!file) return new Response("Introuvable", { status: 404 });
  const user = file.isPublic ? null : await getCurrentUser();
  if (!(await canReadFile(user, file))) return new Response("Accès refusé", { status: user ? 403 : 401 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      "Content-Disposition": `${file.mime.startsWith("image/") || file.mime === "application/pdf" ? "inline" : "attachment"}; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": file.isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
