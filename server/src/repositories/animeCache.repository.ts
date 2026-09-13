import type Database from "better-sqlite3";
import { getDatabase } from "../database/connection.js";

type CacheRow = { payload: string };

export class AnimeCacheRepository {
  constructor(private readonly db: Database.Database = getDatabase()) {}

  get<T>(cacheKey: string, now = new Date()): T | null {
    const row = this.db
      .prepare("SELECT payload FROM anime_cache WHERE cache_key = ? AND expires_at > ?")
      .get(cacheKey, now.toISOString()) as CacheRow | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.payload) as T;
    } catch {
      this.delete(cacheKey);
      return null;
    }
  }

  set(cacheKey: string, value: unknown, ttlSeconds: number, anilistId: number | null = null): void {
    const cachedAt = new Date();
    const expiresAt = new Date(cachedAt.getTime() + ttlSeconds * 1000);

    this.db
      .prepare(`
        INSERT INTO anime_cache (cache_key, anilist_id, payload, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          anilist_id = excluded.anilist_id,
          payload = excluded.payload,
          cached_at = excluded.cached_at,
          expires_at = excluded.expires_at
      `)
      .run(cacheKey, anilistId, JSON.stringify(value), cachedAt.toISOString(), expiresAt.toISOString());
  }

  delete(cacheKey: string): void {
    this.db.prepare("DELETE FROM anime_cache WHERE cache_key = ?").run(cacheKey);
  }

  deleteExpired(now = new Date()): number {
    return this.db.prepare("DELETE FROM anime_cache WHERE expires_at <= ?").run(now.toISOString()).changes;
  }
}
