/**
 * Applique les migrations, verrouille les tables (RLS sans politique) et insère
 * les données de référence + le super administrateur défini par variables d'environnement.
 * Utilisé par `npm run vercel-build` et `npm run db:migrate`.
 */
import { existsSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../src/server/db/schema";
import { seedAdmin, seedBase } from "../src/server/db/seed";
import type { DB } from "../src/server/db";

for (const file of [".env.production.local", ".env.local"]) {
  if (!process.env.DATABASE_URL && existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL absent : migrations ignorées (la base locale PGlite se migre au démarrage).");
    return;
  }
  const client = postgres(url, { max: 1, max_pipeline: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(client, { schema }) as unknown as DB;
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    await client`
      do $$
      declare t record;
      begin
        for t in select tablename from pg_tables where schemaname = 'public' loop
          execute format('alter table public.%I enable row level security', t.tablename);
        end loop;
        if exists (select 1 from pg_roles where rolname = 'anon') then
          execute 'revoke all on all tables in schema public from anon, authenticated';
          execute 'revoke all on all sequences in schema public from anon, authenticated';
        end if;
      end $$;
    `;
    await seedBase(db);
    const admin = await seedAdmin(db);
    console.log(admin ? `Super administrateur créé : ${admin}` : "Migrations et données de référence à jour.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
