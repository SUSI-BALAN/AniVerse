import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { getPostgresPool, closePostgres } from "./postgres.js";

export const migrationDirectory = fileURLToPath(new URL("../../migrations/postgres/", import.meta.url));
export async function migratePostgres(pool: Pool = getPostgresPool(), directory = migrationDirectory) {
  const files = (await readdir(directory)).filter(name => /^\d+_[\w-]+\.sql$/.test(name)).sort();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(91739001)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    const applied = new Map((await client.query("SELECT version,name FROM schema_migrations")).rows.map(row => [Number(row.version), row.name]));
    const versions = new Set<number>();
    for (const name of files) {
      const version = Number(name.split("_")[0]);
      if (versions.has(version)) throw new Error("Duplicate migration version.");
      versions.add(version);
      if (applied.has(version)) {
        if (applied.get(version) !== name) throw new Error("Applied migration name differs from disk.");
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(await readFile(resolve(directory, name), "utf8"));
        await client.query("INSERT INTO schema_migrations(version,name) VALUES($1,$2)", [version,name]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(91739001)").catch(() => undefined);
    client.release();
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  migratePostgres().then(() => console.log("PostgreSQL migrations applied.")).catch(() => {
    console.error("PostgreSQL migration failed; deployment must stop."); process.exitCode = 1;
  }).finally(closePostgres);
}
