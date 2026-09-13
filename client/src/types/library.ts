import type { Anime } from "./anime";

export type WatchlistStatus = "PLANNING" | "WATCHING" | "COMPLETED" | "ON_HOLD" | "DROPPED";
export const WATCHLIST_STATUSES: WatchlistStatus[] = ["PLANNING", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"];
export type LibraryAnime = { anilistId: number; malId: number | null; title: string; titleRomaji: string | null; coverImage: string | null; bannerImage: string | null; format: string | null; seasonYear: number | null; averageScore: number | null; genres: string[] };
export type Favorite = LibraryAnime & { id: number; addedAt: string };
export type WatchlistItem = LibraryAnime & { id: number; status: WatchlistStatus; notes: string | null; addedAt: string; updatedAt: string };
export type RecentlyViewed = LibraryAnime & { id: number; lastViewedAt: string; viewCount: number };
export type SearchHistoryItem = { id: number; query: string; searchedAt: string };

export function toLibraryAnime(anime: Anime): LibraryAnime {
  return { anilistId: anime.id, malId: anime.malId, title: anime.title.english || anime.title.romaji || anime.title.native || "Untitled anime", titleRomaji: anime.title.romaji, coverImage: anime.coverImage.extraLarge || anime.coverImage.large, bannerImage: anime.bannerImage, format: anime.format, seasonYear: anime.seasonYear, averageScore: anime.averageScore, genres: anime.genres };
}

export function libraryToAnime(item: LibraryAnime): Anime {
  return { id: item.anilistId, malId: item.malId, title: { english: item.title, romaji: item.titleRomaji, native: null }, description: null, coverImage: { large: item.coverImage, extraLarge: item.coverImage, color: null }, bannerImage: item.bannerImage, genres: item.genres ?? [], format: item.format, status: null, season: null, seasonYear: item.seasonYear, episodes: null, duration: null, averageScore: item.averageScore, popularity: null, trending: null, studios: [], isAdult: false };
}
