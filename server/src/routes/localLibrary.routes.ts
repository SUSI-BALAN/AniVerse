import { Router } from "express";
import { z } from "zod";
import type Database from "better-sqlite3";
import { FavoritesRepository, RecentlyViewedRepository, SearchHistoryRepository, SettingsRepository, WatchlistRepository, WATCHLIST_STATUSES } from "../repositories/localLibrary.repository.js";
import { AppError } from "../utils/appError.js";

const id = z.coerce.number().int().positive();
const snapshot = z.object({
  anilistId: id,
  malId: z.number().int().nonnegative().nullable().optional(),
  title: z.string().trim().min(1).max(240),
  titleRomaji: z.string().trim().max(240).nullable().optional(),
  coverImage: z.string().url().max(2000).nullable().optional(),
  bannerImage: z.string().url().max(2000).nullable().optional(),
  format: z.string().trim().max(30).nullable().optional(),
  seasonYear: z.number().int().min(1900).max(2200).nullable().optional(),
  averageScore: z.number().min(0).max(100).nullable().optional()
  ,genres: z.array(z.string().trim().max(40)).max(30).optional()
});
const status = z.enum(WATCHLIST_STATUSES);
const settingKey = z.enum(["theme", "title_preference", "reduced_motion", "show_adult_content", "default_list_status", "default_audio_language", "autoplay", "auto_next", "default_provider"]);
const settingValue = z.string().trim().min(1).max(100);

export function createLocalLibraryRouter(db: Database.Database) {
  const router = Router();
  const favorites = new FavoritesRepository(db);
  const watchlist = new WatchlistRepository(db);
  const history = new RecentlyViewedRepository(db);
  const searches = new SearchHistoryRepository(db);
  const settings = new SettingsRepository(db);

  router.get("/favorites", (_request, response) => response.json({ success: true, data: favorites.getAll() }));
  router.get("/favorites/:animeId", (request, response) => response.json({ success: true, data: favorites.findByAnimeId(id.parse(request.params.animeId)) }));
  router.post("/favorites", (request, response) => response.status(201).json({ success: true, data: favorites.add(snapshot.parse(request.body)) }));
  router.delete("/favorites/:animeId", (request, response) => response.json({ success: true, data: { removed: favorites.remove(id.parse(request.params.animeId)) } }));

  router.get("/watchlist", (request, response) => response.json({ success: true, data: watchlist.getAll(request.query.status ? status.parse(request.query.status) : undefined) }));
  router.get("/watchlist/:animeId", (request, response) => response.json({ success: true, data: watchlist.findByAnimeId(id.parse(request.params.animeId)) }));
  router.post("/watchlist", (request, response) => { const body = z.union([z.object({ anime: snapshot, status: status.default("PLANNING") }), snapshot.extend({ status: status.default("PLANNING") })]).parse(request.body); const anime = "anime" in body ? body.anime : body; return response.status(201).json({ success: true, data: watchlist.add(anime, body.status) }); });
  router.patch("/watchlist/:animeId", (request, response) => { const item = watchlist.updateStatus(id.parse(request.params.animeId), status.parse((request.body as { status?: unknown }).status)); if (!item) throw new AppError(404, "WATCHLIST_NOT_FOUND", "That anime is not in your list."); return response.json({ success: true, data: item }); });
  router.delete("/watchlist/:animeId", (request, response) => response.json({ success: true, data: { removed: watchlist.remove(id.parse(request.params.animeId)) } }));

  router.get("/history", (_request, response) => response.json({ success: true, data: history.getAll() }));
  router.post("/history", (request, response) => response.status(201).json({ success: true, data: history.record(snapshot.parse(request.body)) }));
  router.delete("/history/:animeId", (request, response) => response.json({ success: true, data: { removed: history.remove(id.parse(request.params.animeId)) } }));
  router.delete("/history", (_request, response) => response.json({ success: true, data: { removed: history.clear() } }));

  router.get("/search-history", (_request, response) => response.json({ success: true, data: searches.getAll() }));
  router.post("/search-history", (request, response) => response.status(201).json({ success: true, data: searches.add(z.object({ query: z.string().trim().min(2).max(100) }).parse(request.body).query) }));
  router.delete("/search-history/:id", (request, response) => response.json({ success: true, data: { removed: searches.remove(id.parse(request.params.id)) } }));
  router.delete("/search-history", (_request, response) => response.json({ success: true, data: { removed: searches.clear() } }));

  router.get("/settings", (_request, response) => response.json({ success: true, data: settings.getAll() }));
  router.get("/settings/:key", (request, response) => { const key = settingKey.parse(request.params.key); return response.json({ success: true, data: { key, value: settings.get(key) } }); });
  router.put("/settings", (request, response) => { const body = z.record(settingKey, settingValue).parse(request.body); for (const [key, value] of Object.entries(body)) settings.set(key, value); return response.json({ success: true, data: settings.getAll() }); });
  router.patch("/settings/:key", (request, response) => { const key = settingKey.parse(request.params.key); const value = settingValue.parse((request.body as { value?: unknown }).value); return response.json({ success: true, data: { key, value: settings.set(key, value) } }); });

  return router;
}
