import type Database from "better-sqlite3";
import type { AnimeSnapshotInput, WatchlistStatus } from "../types/library.types.js";
import { FavoritesRepository, RecentlyViewedRepository, SearchHistoryRepository, SettingsRepository, WatchlistRepository } from "./localLibrary.repository.js";
import { PlaybackRepository, type ProgressInput } from "./playback.repository.js";
import type { UserLibraryRepository, UserPlaybackRepository } from "./repository.contracts.js";

export class SQLiteUserLibraryRepository implements UserLibraryRepository {
  private f; private w; private r; private s; private p;
  constructor(db: Database.Database) { this.f = new FavoritesRepository(db); this.w = new WatchlistRepository(db); this.r = new RecentlyViewedRepository(db); this.s = new SearchHistoryRepository(db); this.p = new SettingsRepository(db); }
  async favorites(_u: string) { return this.f.getAll(); } async favorite(_u: string, id: number) { return this.f.findByAnimeId(id); }
  async saveFavorite(_u: string, input: AnimeSnapshotInput) { return this.f.add(input); } async removeFavorite(_u: string, id: number) { return this.f.remove(id); }
  async watchlist(_u: string, status?: WatchlistStatus) { return this.w.getAll(status); } async watchlistItem(_u: string, id: number) { return this.w.findByAnimeId(id); }
  async saveWatchlist(_u: string, input: AnimeSnapshotInput, status: WatchlistStatus) { return this.w.add(input, status); } async updateWatchlist(_u: string, id: number, status: WatchlistStatus) { return this.w.updateStatus(id, status); }
  async removeWatchlist(_u: string, id: number) { return this.w.remove(id); } async recentlyViewed(_u: string, limit?: number) { return this.r.getAll(limit); }
  async recordViewed(_u: string, input: AnimeSnapshotInput) { return this.r.record(input); } async removeViewed(_u: string, id: number) { return this.r.remove(id); } async clearViewed(_u: string) { return this.r.clear(); }
  async searches(_u: string, limit?: number) { return this.s.getAll(limit); } async saveSearch(_u: string, query: string) { return this.s.add(query); } async removeSearch(_u: string, id: number) { return this.s.remove(id); } async clearSearches(_u: string) { return this.s.clear(); }
  async settings(_u: string) { return this.p.getAll(); } async setting(_u: string, key: string) { return this.p.get(key); } async saveSetting(_u: string, key: string, value: string) { return this.p.set(key, value); }
}

export class SQLiteUserPlaybackRepository implements UserPlaybackRepository {
  private repository: PlaybackRepository;
  constructor(db: Database.Database) { this.repository = new PlaybackRepository(db); }
  async allProgress(_u:string){return this.repository.getAll();} async animeProgress(_u: string, id: number) { return this.repository.getAnime(id); } async episodeProgress(_u: string, id: number, ep: number) { return this.repository.getEpisode(id, ep); }
  async saveProgress(_u: string, input: ProgressInput) { return this.repository.upsert(input); } async removeEpisodeProgress(_u: string, id: number, ep: number) { return this.repository.removeEpisode(id, ep); }
  async removeAnimeProgress(_u: string, id: number) { return this.repository.removeAnime(id); } async continueWatching(_u: string, limit?: number) { return this.repository.continueWatching(limit); }
  async recentlyCompleted(_u: string, limit?: number) { return this.repository.recentlyCompleted(limit); } async saveHistory(_u: string, input: ProgressInput) { return this.repository.recordHistory(input); }
  async history(_u: string, limit?: number) { return this.repository.getHistory(limit); } async removeHistory(_u: string, id: number) { return this.repository.removeHistory(id); } async clearHistory(_u: string) { return this.repository.clearHistory(); }
}
