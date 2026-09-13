import type Database from "better-sqlite3";
import { WATCHLIST_STATUSES, type AnimeSnapshotInput, type Favorite, type RecentlyViewed, type SearchHistoryItem, type WatchlistItem, type WatchlistStatus } from "../types/library.types.js";

const snapshotColumns = "anilist_id AS anilistId, mal_id AS malId, title, title_romaji AS titleRomaji, cover_image AS coverImage, banner_image AS bannerImage, format, season_year AS seasonYear, average_score AS averageScore, genres";

function snapshotParams(input: AnimeSnapshotInput) {
  return [input.anilistId, input.malId ?? null, input.title, input.titleRomaji ?? null, input.coverImage ?? null, input.bannerImage ?? null, input.format ?? null, input.seasonYear ?? null, input.averageScore ?? null, JSON.stringify(input.genres ?? [])];
}

export class FavoritesRepository {
  constructor(private readonly db: Database.Database) {}
  getAll(): Favorite[] { return this.db.prepare(`SELECT id, ${snapshotColumns}, added_at AS addedAt FROM favorites ORDER BY added_at DESC, id DESC`).all() as Favorite[]; }
  findByAnimeId(anilistId: number): Favorite | null { return (this.db.prepare(`SELECT id, ${snapshotColumns}, added_at AS addedAt FROM favorites WHERE anilist_id = ?`).get(anilistId) as Favorite | undefined) ?? null; }
  add(input: AnimeSnapshotInput): Favorite { this.db.prepare(`INSERT INTO favorites (anilist_id, mal_id, title, title_romaji, cover_image, banner_image, format, season_year, average_score, genres) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(anilist_id) DO UPDATE SET title=excluded.title, title_romaji=excluded.title_romaji, cover_image=excluded.cover_image, banner_image=excluded.banner_image, format=excluded.format, season_year=excluded.season_year, average_score=excluded.average_score, genres=excluded.genres`).run(...snapshotParams(input)); return this.findByAnimeId(input.anilistId)!; }
  remove(anilistId: number): boolean { return this.db.prepare("DELETE FROM favorites WHERE anilist_id = ?").run(anilistId).changes > 0; }
}

export class WatchlistRepository {
  constructor(private readonly db: Database.Database) {}
  getAll(status?: WatchlistStatus): WatchlistItem[] { return this.db.prepare(`SELECT id, ${snapshotColumns}, status, NULL AS notes, added_at AS addedAt, updated_at AS updatedAt FROM watchlist ${status ? "WHERE status = ?" : ""} ORDER BY updated_at DESC, id DESC`).all(...(status ? [status] : [])) as WatchlistItem[]; }
  findByAnimeId(anilistId: number): WatchlistItem | null { return (this.db.prepare(`SELECT id, ${snapshotColumns}, status, NULL AS notes, added_at AS addedAt, updated_at AS updatedAt FROM watchlist WHERE anilist_id = ?`).get(anilistId) as WatchlistItem | undefined) ?? null; }
  add(input: AnimeSnapshotInput, status: WatchlistStatus): WatchlistItem { this.db.prepare(`INSERT INTO watchlist (anilist_id, mal_id, title, title_romaji, cover_image, banner_image, format, season_year, average_score, genres, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(anilist_id) DO UPDATE SET title=excluded.title, title_romaji=excluded.title_romaji, cover_image=excluded.cover_image, banner_image=excluded.banner_image, format=excluded.format, season_year=excluded.season_year, average_score=excluded.average_score, genres=excluded.genres, status=excluded.status, updated_at=CURRENT_TIMESTAMP`).run(...snapshotParams(input), status); return this.findByAnimeId(input.anilistId)!; }
  updateStatus(anilistId: number, status: WatchlistStatus): WatchlistItem | null { this.db.prepare("UPDATE watchlist SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE anilist_id = ?").run(status, anilistId); return this.findByAnimeId(anilistId); }
  remove(anilistId: number): boolean { return this.db.prepare("DELETE FROM watchlist WHERE anilist_id = ?").run(anilistId).changes > 0; }
}

export class RecentlyViewedRepository {
  constructor(private readonly db: Database.Database) {}
  getAll(limit = 250): RecentlyViewed[] { return this.db.prepare(`SELECT id, ${snapshotColumns}, last_viewed_at AS lastViewedAt, view_count AS viewCount FROM recently_viewed ORDER BY last_viewed_at DESC, id DESC LIMIT ?`).all(Math.min(Math.max(limit, 1), 250)) as RecentlyViewed[]; }
  record(input: AnimeSnapshotInput): RecentlyViewed { this.db.prepare(`INSERT INTO recently_viewed (anilist_id, mal_id, title, title_romaji, cover_image, banner_image, format, season_year, average_score, genres) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(anilist_id) DO UPDATE SET title=excluded.title, title_romaji=excluded.title_romaji, cover_image=excluded.cover_image, banner_image=excluded.banner_image, format=excluded.format, season_year=excluded.season_year, average_score=excluded.average_score, genres=excluded.genres, last_viewed_at=CURRENT_TIMESTAMP, view_count=view_count + 1`).run(...snapshotParams(input)); this.db.prepare("DELETE FROM recently_viewed WHERE id NOT IN (SELECT id FROM recently_viewed ORDER BY last_viewed_at DESC, id DESC LIMIT 250)").run(); return this.db.prepare(`SELECT id, ${snapshotColumns}, last_viewed_at AS lastViewedAt, view_count AS viewCount FROM recently_viewed WHERE anilist_id = ?`).get(input.anilistId) as RecentlyViewed; }
  remove(anilistId: number): boolean { return this.db.prepare("DELETE FROM recently_viewed WHERE anilist_id = ?").run(anilistId).changes > 0; }
  clear(): number { return this.db.prepare("DELETE FROM recently_viewed").run().changes; }
}

export class SearchHistoryRepository {
  constructor(private readonly db: Database.Database) {}
  getAll(limit = 20): SearchHistoryItem[] { return this.db.prepare("SELECT id, query, searched_at AS searchedAt FROM search_history ORDER BY searched_at DESC, id DESC LIMIT ?").all(Math.min(Math.max(limit, 1), 100)) as SearchHistoryItem[]; }
  add(query: string): SearchHistoryItem { const normalized = query.trim().replace(/\s+/g, " "); const latest = this.db.prepare("SELECT id, query, searched_at AS searchedAt FROM search_history ORDER BY id DESC LIMIT 1").get() as SearchHistoryItem | undefined; if (!latest || latest.query.toLocaleLowerCase() !== normalized.toLocaleLowerCase()) this.db.prepare("INSERT INTO search_history (query) VALUES (?)").run(normalized); else this.db.prepare("UPDATE search_history SET searched_at = CURRENT_TIMESTAMP WHERE id = ?").run(latest.id); return this.db.prepare("SELECT id, query, searched_at AS searchedAt FROM search_history ORDER BY id DESC LIMIT 1").get() as SearchHistoryItem; }
  remove(id: number): boolean { return this.db.prepare("DELETE FROM search_history WHERE id = ?").run(id).changes > 0; }
  clear(): number { return this.db.prepare("DELETE FROM search_history").run().changes; }
}

export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}
  getAll(): Record<string, string> { return Object.fromEntries((this.db.prepare("SELECT key, value FROM app_settings ORDER BY key").all() as Array<{ key: string; value: string }>).map((row) => [row.key, row.value])); }
  get(key: string): string | null { return (this.db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value: string } | undefined)?.value ?? null; }
  set(key: string, value: string): string { this.db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").run(key, value); return value; }
}

export { WATCHLIST_STATUSES };
