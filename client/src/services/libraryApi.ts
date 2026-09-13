import type { LibraryAnime, Favorite, RecentlyViewed, SearchHistoryItem, WatchlistItem, WatchlistStatus } from "../types/library";
import { apiFetch } from "./apiClient";

class LibraryApiError extends Error {}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await apiFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } }); }
  catch { throw new LibraryApiError("AniVerse local data is unavailable."); }
  const text = await response.text(); let body: { data?: T; error?: { message?: string } } = {};
  try { body = text ? JSON.parse(text) : {}; } catch { throw new LibraryApiError("AniVerse returned an unexpected response."); }
  if (!response.ok) throw new LibraryApiError(body.error?.message ?? "Unable to update local data.");
  return body.data as T;
}
const json = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });

export const libraryApi = {
  favorites: { all: () => request<Favorite[]>("/api/favorites"), add: (anime: LibraryAnime) => request<Favorite>("/api/favorites", json(anime)), remove: (id: number) => request<{ removed: boolean }>(`/api/favorites/${id}`, { method: "DELETE" }) },
  watchlist: { all: (status?: WatchlistStatus) => request<WatchlistItem[]>(`/api/watchlist${status ? `?status=${status}` : ""}`), add: (anime: LibraryAnime, status: WatchlistStatus) => request<WatchlistItem>("/api/watchlist", json({ anime, status })), update: (id: number, status: WatchlistStatus) => request<WatchlistItem>(`/api/watchlist/${id}`, { method: "PATCH", body: JSON.stringify({ status }), headers: { "Content-Type": "application/json" } }), remove: (id: number) => request<{ removed: boolean }>(`/api/watchlist/${id}`, { method: "DELETE" }) },
  history: { all: () => request<RecentlyViewed[]>("/api/history"), record: (anime: LibraryAnime) => request<RecentlyViewed>("/api/history", json(anime)), remove: (id: number) => request<{ removed: boolean }>(`/api/history/${id}`, { method: "DELETE" }), clear: () => request<{ removed: number }>("/api/history", { method: "DELETE" }) },
  searchHistory: { all: () => request<SearchHistoryItem[]>("/api/search-history"), add: (query: string) => request<SearchHistoryItem>("/api/search-history", json({ query })), remove: (id: number) => request<{ removed: boolean }>(`/api/search-history/${id}`, { method: "DELETE" }), clear: () => request<{ removed: number }>("/api/search-history", { method: "DELETE" }) },
  settings: { all: () => request<Record<string, string>>("/api/settings"), update: (key: string, value: string) => request<{ key: string; value: string }>(`/api/settings/${key}`, { method: "PATCH", body: JSON.stringify({ value }), headers: { "Content-Type": "application/json" } }) }
};
