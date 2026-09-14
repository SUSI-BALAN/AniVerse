import {settingValues} from "../utils/validation.js";
import { Router } from "express";
import { z } from "zod";
import type Database from "better-sqlite3";

export const DATA_EXPORT_VERSION = 1;
const PROVIDERS = ["cinextream", "yenime", "zokoanime"] as const;
const LANGUAGES = ["sub", "dub"] as const;
const STATUSES = ["PLANNING", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"] as const;
const SETTING_VALUES: Record<string, readonly string[]> = settingValues;
const timestamp = z.string().min(1).max(40).optional();
const nullableUrl = z.string().url().max(2000).nullable().optional();
const completedValue = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean);
const genres = z.union([z.array(z.string().trim().min(1).max(40)).max(30), z.string().max(1500)]).optional().transform((value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 30) : []; }
  catch { return []; }
});
const snapshot = z.object({
  id: z.number().int().positive().optional(), anilistId: z.number().int().positive(), malId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(240), titleRomaji: z.string().max(240).nullable().optional(), coverImage: nullableUrl,
  bannerImage: nullableUrl, format: z.string().max(30).nullable().optional(), seasonYear: z.number().int().min(1900).max(3000).nullable().optional(),
  averageScore: z.number().min(0).max(100).nullable().optional(), genres, addedAt: timestamp, updatedAt: timestamp
}).strict();
const episodeProgress = z.object({
  id: z.number().int().positive().optional(), anilistId: z.number().int().positive(), malId: z.number().int().positive().nullable().optional(),
  episodeNumber: z.number().int().positive().max(10000), totalEpisodes: z.number().int().positive().max(10000).nullable().optional(),
  currentTime: z.number().finite().min(0).max(10_000_000), duration: z.number().finite().positive().max(10_000_000),
  percentage: z.number().finite().min(0).max(100).optional(), completed: completedValue.optional().default(false), title: z.string().min(1).max(240),
  coverImage: nullableUrl, genres, providerId: z.enum(PROVIDERS).nullable().optional(), language: z.enum(LANGUAGES).nullable().optional(),
  firstWatchedAt: timestamp, lastWatchedAt: timestamp, completedAt: z.string().max(40).nullable().optional(), createdAt: timestamp, updatedAt: timestamp
}).strict().superRefine((item, context) => { if (item.currentTime > item.duration * 1.05) context.addIssue({ code: "custom", message: "Playback time exceeds duration" }); });
const watchHistory = z.object({
  id: z.number().int().positive().optional(), anilistId: z.number().int().positive(), malId: z.number().int().positive().nullable().optional(),
  episodeNumber: z.number().int().positive().max(10000), totalEpisodes: z.number().int().positive().max(10000).nullable().optional(), title: z.string().min(1).max(240),
  coverImage: nullableUrl, progressPercentage: z.number().finite().min(0).max(100), completed: completedValue.optional().default(false), genres,
  providerId: z.enum(PROVIDERS).nullable().optional(), language: z.enum(LANGUAGES).nullable().optional(), watchedAt: timestamp, updatedAt: timestamp, createdAt: timestamp
}).strict();
export const backupSchema = z.object({
  app: z.literal("AniVerse"), version: z.literal(DATA_EXPORT_VERSION), exportedAt: z.string().max(40).optional(),
  favorites: z.array(snapshot).max(500).default([]), watchlist: z.array(snapshot.extend({ status: z.enum(STATUSES), notes: z.string().max(2000).nullable().optional() }).strict()).max(500).default([]),
  settings: z.record(z.string(), z.string().max(100)).default({}),
  searchHistory: z.array(z.object({ id: z.number().int().positive().optional(), query: z.string().trim().min(2).max(100), searchedAt: timestamp }).strict()).max(500).default([]),
  recentlyViewed: z.array(snapshot.extend({ lastViewedAt: timestamp, viewCount: z.number().int().positive().max(1_000_000).optional() }).strict()).max(500).default([]),
  episodeProgress: z.array(episodeProgress).max(2000).default([]), watchHistory: z.array(watchHistory).max(2000).default([])
}).strict().superRefine((data, context) => { for (const [key, value] of Object.entries(data.settings)) if (!SETTING_VALUES[key]?.includes(value)) context.addIssue({ code: "custom", path: ["settings", key], message: `Invalid setting ${key}` }); });

const camelRows = (db: Database.Database, table: string) => db.prepare(`SELECT * FROM ${table}`).all().map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>).filter(([key])=>key!=="id").map(([key, value]) => [key.replace(/_([a-z])/g, (_, character: string) => character.toUpperCase()), value])));
const genresJson = (value: string[]) => JSON.stringify(value);

export function createDataRouter(db: Database.Database) {
  const router = Router();
  router.get("/stats", (_req, res) => {
    const one = (sql: string) => Number((db.prepare(sql).get() as { value?: number } | undefined)?.value ?? 0);
    const genreCounts = new Map<string, number>();
    const sources = db.prepare("SELECT genres, 3 weight FROM favorites UNION ALL SELECT genres, CASE status WHEN 'WATCHING' THEN 2 ELSE 1 END FROM watchlist UNION ALL SELECT genres, CASE WHEN completed=1 THEN 5 ELSE 4 END FROM episode_progress WHERE current_time >= 30 OR completed=1").all() as Array<{ genres: string | null; weight: number }>;
    for (const source of sources) try { for (const genre of JSON.parse(source.genres ?? "[]") as unknown[]) if (typeof genre === "string") genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + source.weight); } catch { /* old rows may have no metadata */ }
    const topGenres = [...genreCounts].map(([genre, score]) => ({ genre, score })).sort((a, b) => b.score - a.score).slice(0, 8);
    const recentActivity = db.prepare("SELECT anilist_id AS anilistId, episode_number AS episodeNumber, title, watched_at AS watchedAt, progress_percentage AS progressPercentage, completed FROM watch_history ORDER BY watched_at DESC LIMIT 8").all();
    res.json({ success: true, data: { favorites: one("SELECT COUNT(*) value FROM favorites"), watchlist: one("SELECT COUNT(*) value FROM watchlist"), watching: one("SELECT COUNT(*) value FROM watchlist WHERE status='WATCHING'"), completedAnime: one("SELECT COUNT(*) value FROM watchlist WHERE status='COMPLETED'"), completedEpisodes: one("SELECT COUNT(*) value FROM episode_progress WHERE completed=1"), inProgressEpisodes: one("SELECT COUNT(*) value FROM episode_progress WHERE completed=0 AND current_time > 0"), estimatedWatchSeconds: one("SELECT COALESCE(SUM(CASE WHEN completed=1 THEN duration ELSE current_time END),0) value FROM episode_progress"), topGenres, recentActivity } });
  });
  router.get("/data/export", (_req, res) => {
    res.setHeader("Content-Disposition", "attachment; filename=aniverse-backup.json");
    res.json({ app: "AniVerse", version: DATA_EXPORT_VERSION, exportedAt: new Date().toISOString(), favorites: camelRows(db, "favorites"), watchlist: camelRows(db, "watchlist"), settings: Object.fromEntries((camelRows(db, "app_settings") as Array<{ key: string; value: string }>).map(({ key, value }) => [key, value])), searchHistory: camelRows(db, "search_history"), recentlyViewed: camelRows(db, "recently_viewed"), episodeProgress: camelRows(db, "episode_progress"), watchHistory: camelRows(db, "watch_history") });
  });
  router.post("/data/import", (req, res) => {
    const input = backupSchema.parse(req.body);
    const transaction = db.transaction(() => {
      const saveSnapshot = (table: "favorites" | "watchlist", item: z.infer<typeof snapshot>, list?: { status: typeof STATUSES[number]; notes?: string | null }) => {
        const listColumns = table === "watchlist" ? ",status,updated_at" : ""; const listValues = table === "watchlist" ? ",?,COALESCE(?,CURRENT_TIMESTAMP)" : "";
        db.prepare(`INSERT INTO ${table}(anilist_id,mal_id,title,title_romaji,cover_image,banner_image,format,season_year,average_score,genres,added_at${listColumns}) VALUES(?,?,?,?,?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP)${listValues}) ON CONFLICT(anilist_id) DO UPDATE SET mal_id=excluded.mal_id,title=excluded.title,title_romaji=excluded.title_romaji,cover_image=excluded.cover_image,banner_image=excluded.banner_image,format=excluded.format,season_year=excluded.season_year,average_score=excluded.average_score,genres=excluded.genres${table === "watchlist" ? ",status=excluded.status,updated_at=excluded.updated_at" : ""}`).run(item.anilistId,item.malId ?? null,item.title,item.titleRomaji ?? null,item.coverImage ?? null,item.bannerImage ?? null,item.format ?? null,item.seasonYear ?? null,item.averageScore ?? null,genresJson(item.genres),item.addedAt ?? null,...(table === "watchlist" ? [list?.status,item.updatedAt ?? null] : []));
      };
      for (const item of input.favorites) saveSnapshot("favorites", item);
      for (const item of input.watchlist) saveSnapshot("watchlist", item, item);
      for (const [key, value] of Object.entries(input.settings)) db.prepare("INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").run(key,value);
      for (const item of input.searchHistory) db.prepare("INSERT INTO search_history(query,searched_at) SELECT ?,COALESCE(?,CURRENT_TIMESTAMP) WHERE NOT EXISTS (SELECT 1 FROM search_history WHERE lower(trim(query))=lower(trim(?)))").run(item.query,item.searchedAt ?? null,item.query);
      for (const item of input.recentlyViewed) db.prepare("INSERT INTO recently_viewed(anilist_id,mal_id,title,title_romaji,cover_image,banner_image,format,season_year,average_score,genres,last_viewed_at,view_count) VALUES(?,?,?,?,?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),?) ON CONFLICT(anilist_id) DO UPDATE SET mal_id=excluded.mal_id,title=excluded.title,title_romaji=excluded.title_romaji,cover_image=excluded.cover_image,banner_image=excluded.banner_image,format=excluded.format,season_year=excluded.season_year,average_score=excluded.average_score,genres=excluded.genres,last_viewed_at=MAX(recently_viewed.last_viewed_at,excluded.last_viewed_at),view_count=MAX(recently_viewed.view_count,excluded.view_count)").run(item.anilistId,item.malId ?? null,item.title,item.titleRomaji ?? null,item.coverImage ?? null,item.bannerImage ?? null,item.format ?? null,item.seasonYear ?? null,item.averageScore ?? null,genresJson(item.genres),item.lastViewedAt ?? null,item.viewCount ?? 1);
      for (const item of input.episodeProgress) db.prepare("INSERT INTO episode_progress(anilist_id,episode_number,total_episodes,current_time,duration,percentage,completed,genres,mal_id,title,cover_image,provider_id,language,first_watched_at,last_watched_at,completed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),COALESCE(?,CURRENT_TIMESTAMP),?,COALESCE(?,CURRENT_TIMESTAMP),COALESCE(?,CURRENT_TIMESTAMP)) ON CONFLICT(anilist_id,episode_number) DO UPDATE SET total_episodes=excluded.total_episodes,current_time=excluded.current_time,duration=excluded.duration,percentage=excluded.percentage,completed=MAX(episode_progress.completed,excluded.completed),genres=excluded.genres,mal_id=excluded.mal_id,title=excluded.title,cover_image=excluded.cover_image,provider_id=excluded.provider_id,language=excluded.language,last_watched_at=MAX(episode_progress.last_watched_at,excluded.last_watched_at),completed_at=COALESCE(episode_progress.completed_at,excluded.completed_at),updated_at=excluded.updated_at").run(item.anilistId,item.episodeNumber,item.totalEpisodes ?? null,item.currentTime,item.duration,item.currentTime/item.duration*100,item.completed?1:0,genresJson(item.genres),item.malId ?? null,item.title,item.coverImage ?? null,item.providerId ?? null,item.language ?? null,item.firstWatchedAt ?? null,item.lastWatchedAt ?? null,item.completedAt ?? null,item.createdAt ?? null,item.updatedAt ?? null);
      for (const item of input.watchHistory) db.prepare("INSERT INTO watch_history(anilist_id,mal_id,title,cover_image,episode_number,total_episodes,progress_percentage,completed,genres,provider_id,language,watched_at,updated_at,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),COALESCE(?,CURRENT_TIMESTAMP),COALESCE(?,CURRENT_TIMESTAMP) WHERE NOT EXISTS (SELECT 1 FROM watch_history WHERE anilist_id=? AND episode_number=? AND watched_at=COALESCE(?,CURRENT_TIMESTAMP))").run(item.anilistId,item.malId ?? null,item.title,item.coverImage ?? null,item.episodeNumber,item.totalEpisodes ?? null,item.progressPercentage,item.completed?1:0,genresJson(item.genres),item.providerId ?? null,item.language ?? null,item.watchedAt ?? null,item.updatedAt ?? null,item.createdAt ?? null,item.anilistId,item.episodeNumber,item.watchedAt ?? null);
    });
    transaction(); res.json({ success: true, data: { imported: true, favoritesImported:input.favorites.length,watchlistImported:input.watchlist.length,settingsImported:Object.keys(input.settings).length,progressImported:input.episodeProgress.length,historyImported:input.watchHistory.length,errors:[] } });
  });
  router.delete("/data/reset/:target", (req, res) => {
    const target = z.enum(["search-history","recently-viewed","watch-history","progress","favorites","watchlist","all"]).parse(req.params.target);
    const tables = { "search-history": ["search_history"], "recently-viewed": ["recently_viewed"], "watch-history": ["watch_history"], progress: ["episode_progress"], favorites: ["favorites"], watchlist: ["watchlist"], all: ["favorites","watchlist","app_settings","search_history","recently_viewed","episode_progress","watch_history","provider_preferences"] }[target];
    const removed = db.transaction(() => tables.reduce((count, table) => count + db.prepare(`DELETE FROM ${table}`).run().changes, 0))();
    res.json({ success: true, data: { removed } });
  });
  return router;
}
