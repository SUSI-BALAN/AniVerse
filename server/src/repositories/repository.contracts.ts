import type { AnimeSnapshotInput, Favorite, RecentlyViewed, SearchHistoryItem, WatchlistItem, WatchlistStatus } from "../types/library.types.js";
import type { EpisodeProgress, WatchHistoryEntry } from "../types/progress.types.js";
import type { ProgressInput } from "./playback.repository.js";
import type {Profile, ProfilePatch} from '../types/profile.types.js';

export interface UserProfileRepository {
  getProfile(userId: string): Promise<Profile>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<Profile>;
}

export interface UserLibraryRepository {
  favorites(userId: string): Promise<Favorite[]>;
  favorite(userId: string, animeId: number): Promise<Favorite | null>;
  saveFavorite(userId: string, input: AnimeSnapshotInput): Promise<Favorite>;
  removeFavorite(userId: string, animeId: number): Promise<boolean>;
  watchlist(userId: string, status?: WatchlistStatus): Promise<WatchlistItem[]>;
  watchlistItem(userId: string, animeId: number): Promise<WatchlistItem | null>;
  saveWatchlist(userId: string, input: AnimeSnapshotInput, status: WatchlistStatus): Promise<WatchlistItem>;
  updateWatchlist(userId: string, animeId: number, status: WatchlistStatus): Promise<WatchlistItem | null>;
  removeWatchlist(userId: string, animeId: number): Promise<boolean>;
  recentlyViewed(userId: string, limit?: number): Promise<RecentlyViewed[]>;
  recordViewed(userId: string, input: AnimeSnapshotInput): Promise<RecentlyViewed>;
  removeViewed(userId: string, animeId: number): Promise<boolean>;
  clearViewed(userId: string): Promise<number>;
  searches(userId: string, limit?: number): Promise<SearchHistoryItem[]>;
  saveSearch(userId: string, query: string): Promise<SearchHistoryItem>;
  removeSearch(userId: string, id: number): Promise<boolean>;
  clearSearches(userId: string): Promise<number>;
  settings(userId: string): Promise<Record<string, string>>;
  setting(userId: string, key: string): Promise<string | null>;
  saveSetting(userId: string, key: string, value: string): Promise<string>;
}

export interface UserPlaybackRepository {
  allProgress(userId: string): Promise<EpisodeProgress[]>;
  animeProgress(userId: string, animeId: number): Promise<EpisodeProgress[]>;
  episodeProgress(userId: string, animeId: number, episode: number): Promise<EpisodeProgress | null>;
  saveProgress(userId: string, input: ProgressInput): Promise<EpisodeProgress>;
  removeEpisodeProgress(userId: string, animeId: number, episode: number): Promise<boolean>;
  removeAnimeProgress(userId: string, animeId: number): Promise<number>;
  continueWatching(userId: string, limit?: number): Promise<EpisodeProgress[]>;
  recentlyCompleted(userId: string, limit?: number): Promise<EpisodeProgress[]>;
  saveHistory(userId: string, input: ProgressInput): Promise<WatchHistoryEntry>;
  history(userId: string, limit?: number): Promise<WatchHistoryEntry[]>;
  removeHistory(userId: string, id: number): Promise<boolean>;
  clearHistory(userId: string): Promise<number>;
}
