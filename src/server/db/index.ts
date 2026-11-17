import "server-only";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

type Holder = { db?: Promise<DB> };
const g = globalThis as unknown as { __sentrajetDb?: Holder };
const holder: Holder = (g.__sentrajetDb ??= {});

async function createLocalDb(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  if (dir !== "memory") (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir === "memory" ? undefined : dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  const { seedBase, seedDemo } = await import("./seed");
  await seedBase(db as unknown as DB);
  if (process.env.SEED_DEMO !== "0") await seedDemo(db as unknown as DB);
  return db as unknown as DB;
}

function createRemoteDb(url: string): DB {
  const client = postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 5),
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return drizzlePg(client, { schema });
}

export function getDb(): Promise<DB> {
  if (!holder.db) {
    const url = process.env.DATABASE_URL;
    holder.db = url ? Promise.resolve(createRemoteDb(url)) : createLocalDb();
    holder.db.catch(() => {
      holder.db = undefined;
    });
  }
  return holder.db;
}

export { schema };
