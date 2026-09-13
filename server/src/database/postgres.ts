import pg from "pg";
import { env } from "../utils/env.js";
import { readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { Pool } = pg;
let pool: pg.Pool | null = null;

export function getPostgresPool() {
  if (!env.DATABASE_URL) throw new Error("PostgreSQL is not configured.");
  if (!pool) {
    // Keep TLS scoped to pg. URL SSL options override programmatic options in pg,
    // so reject conflicts rather than losing CA or hostname verification.
    const url = new URL(env.DATABASE_URL);
    if ([...url.searchParams.keys()].some(key => key.toLowerCase().startsWith("ssl") || key.toLowerCase() === "uselibpqcompat")) {
      throw new Error("Configure PostgreSQL TLS through DATABASE_SSL and DATABASE_CA_CERT_PATH; remove SSL parameters from DATABASE_URL.");
    }
    const ca = env.DATABASE_CA_CERT_PATH ? readFileSync(resolve(env.DATABASE_CA_CERT_PATH), "utf8") : undefined;
    pool = new Pool({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000, ssl: env.DATABASE_SSL ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : false });
  }
  return pool;
}

export async function checkPostgres() {
  const result = await getPostgresPool().query("select 1 as ready");
  return result.rows[0]?.ready === 1;
}
export async function checkMigrations(databasePool:pg.Pool=getPostgresPool()) {
  await databasePool.query("SELECT 1");
  const files=(await readdir(new URL("../../migrations/postgres/",import.meta.url))).filter(name=>/^\d+_[\w-]+\.sql$/.test(name));
  const applied=new Set((await databasePool.query("SELECT name FROM schema_migrations")).rows.map(row=>row.name));
  if(files.some(name=>!applied.has(name)))throw new Error("Pending database migrations.");
}

export async function closePostgres() { if (pool) { await pool.end(); pool = null; } }
