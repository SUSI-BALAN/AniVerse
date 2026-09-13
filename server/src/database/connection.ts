import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../utils/env.js";

let database: Database.Database | null = null;

export function getDatabase() {
  if (!database) {
    const databasePath = resolve(process.cwd(), env.DATABASE_PATH);
    mkdirSync(dirname(databasePath), { recursive: true });
    database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
  }

  return database;
}

export function initializeDatabase(db: Database.Database = getDatabase()) {
  const builtSchemaUrl = new URL("./schema.sql", import.meta.url);
  const schemaPath = fileURLToPath(existsSync(builtSchemaUrl) ? builtSchemaUrl : new URL("../../src/database/schema.sql", import.meta.url));
  const schema = readFileSync(schemaPath, "utf8");
  const existingColumns = db.pragma("table_info(anime_cache)") as Array<{ name: string }>;

  if (existingColumns.length > 0 && !existingColumns.some((column) => column.name === "cache_key")) {
    db.transaction(() => {
      db.exec("ALTER TABLE anime_cache RENAME TO anime_cache_legacy");
      db.exec(schema);
      db.exec(`
        INSERT INTO anime_cache (cache_key, anilist_id, payload, cached_at, expires_at)
        SELECT 'details:' || anilist_id, anilist_id, payload, cached_at, datetime(cached_at, '+12 hours')
        FROM anime_cache_legacy
      `);
      db.exec("DROP TABLE anime_cache_legacy");
    })();
  }
  else {
    db.exec(schema);
  }

  // Phase 4 extends the existing local snapshots without replacing user data.
  const migrations: Record<string, string[]> = {
    favorites: ["title_romaji TEXT", "banner_image TEXT", "format TEXT", "season_year INTEGER", "average_score INTEGER", "genres TEXT"],
    watchlist: ["title_romaji TEXT", "banner_image TEXT", "format TEXT", "season_year INTEGER", "average_score INTEGER", "genres TEXT"],
    episode_progress: ["mal_id INTEGER", "title TEXT", "cover_image TEXT", "genres TEXT", "total_episodes INTEGER", "provider_id TEXT", "language TEXT", "first_watched_at TEXT", "last_watched_at TEXT", "completed_at TEXT", "created_at TEXT"],
    watch_history: ["total_episodes INTEGER", "provider_id TEXT", "language TEXT", "genres TEXT", "updated_at TEXT", "created_at TEXT"],
    recently_viewed: ["genres TEXT"]
  };
  for (const [table, columns] of Object.entries(migrations)) {
    const existing = new Set((db.pragma(`table_info(${table})`) as Array<{ name: string }>).map((column) => column.name));
    for (const column of columns) {
      const name = column.split(" ", 1)[0];
      if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`);
    }
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_episode_progress_updated_at ON episode_progress (updated_at DESC)");

  db.prepare("UPDATE watchlist SET status = UPPER(status) WHERE status IN ('planning', 'watching', 'completed', 'on_hold', 'dropped')").run();
  const defaults = {
    theme: "dark",
    title_preference: "english",
    reduced_motion: "false",
    show_adult_content: "false",
    default_list_status: "PLANNING",
    default_provider: "cinextream",
    default_audio_language: "sub",
    autoplay: "false",
    auto_next: "true"
  };
  const insertSetting = db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING");
  db.transaction(() => { for (const [key, value] of Object.entries(defaults)) insertSetting.run(key, value); })();
}
