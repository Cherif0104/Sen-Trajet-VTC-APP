import { mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import postgres from "postgres"
import { ensureSeed } from "@/server/seed"
import type { Sql } from "@/server/sql"

type Pg = ReturnType<typeof postgres>

type Driver =
  | { kind: "pglite"; client: PGlite }
  | { kind: "pg"; sql: Pg }

let queue: Promise<unknown> = Promise.resolve()
let opening: Promise<Driver> | null = null

async function open(): Promise<Driver> {
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL
    const ssl = /localhost|127\.0\.0\.1/.test(url) ? false : ("require" as const)
    return { kind: "pg", sql: postgres(url, { prepare: false, ssl, max: 1 }) }
  }
  if (process.env.YOON_DB === "memory") return { kind: "pglite", client: new PGlite() }
  const dir = path.join(process.cwd(), "data", "pglite")
  mkdirSync(dir, { recursive: true })
  return { kind: "pglite", client: new PGlite(dir) }
}

async function exec(driver: Driver, statement: string) {
  if (driver.kind === "pglite") await driver.client.exec(statement)
  else await driver.sql.unsafe(statement)
}

async function migrate(driver: Driver) {
  const schema = readFileSync(path.join(process.cwd(), "src/server/schema.sql"), "utf8")
  const statements = schema
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.replace(/--.*$/gm, "").trim().length > 0)
  for (const statement of statements) {
    await exec(driver, statement)
  }
}

function asSql(driver: Driver, tx?: Pg): Sql {
  if (driver.kind === "pg") {
    const client = tx ?? driver.sql
    return {
      query: async <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
        (await client.unsafe(text, params as never[])) as unknown as T[],
    }
  }
  return {
    query: async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => {
      const result = await driver.client.query<T>(text, params)
      return result.rows
    },
  }
}

async function withDriver<T>(driver: Driver, fn: (sql: Sql) => Promise<T>) {
  if (driver.kind === "pg") {
    return driver.sql.begin(async (tx) => fn(asSql(driver, tx as unknown as Pg))) as Promise<T>
  }
  await driver.client.exec("BEGIN")
  try {
    const result = await fn(asSql(driver))
    await driver.client.exec("COMMIT")
    return result
  } catch (error) {
    try {
      await driver.client.exec("ROLLBACK")
    } catch {
      /* the failed statement already aborted the transaction */
    }
    throw error
  }
}

async function ready() {
  if (!opening) {
    opening = (async () => {
      const driver = await open()
      await migrate(driver)
      await withDriver(driver, (sql) => ensureSeed(sql))
      return driver
    })()
  }
  return opening
}

export function withDb<T>(fn: (sql: Sql) => Promise<T>) {
  const run = queue.then(async () => withDriver(await ready(), fn))
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
