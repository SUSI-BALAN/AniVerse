import type { AnimeDetails, AnimePageResponse, AnimeSeason, BrowseFilters } from "../types/anime";
import { apiError, apiFetch } from './apiClient';

export class AnimeApiError extends Error {
  constructor(
    message: string,
    public readonly code = "NETWORK_ERROR",
    public readonly status = 0,
    public readonly requestId?: string
  ) {
    super(message);
  }
}

async function apiRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const existing = inFlight.get(path);
  if (existing && !existing.signal?.aborted) return existing.promise as Promise<T>;
  const request = performRequest<T>(path, signal).finally(() => { if (inFlight.get(path)?.promise === request) inFlight.delete(path); });
  inFlight.set(path, { promise: request, signal });
  return request;
}

const inFlight = new Map<string, { promise: Promise<unknown>; signal?: AbortSignal }>();

async function performRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(path, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AnimeApiError("We couldn't reach AniVerse. Check your connection and try again.");
  }

  if (!response.ok) {
    const correlated=await apiError(response,"We couldn't load anime information right now. Please try again.");
    throw new AnimeApiError(correlated.message,correlated.code,response.status,correlated.requestId);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new AnimeApiError("AniVerse returned an unexpected response.", "INVALID_RESPONSE", response.status);
  }

  return body as T;
}

function queryString(values: Record<string, string | number | string[] | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });
  return params.toString();
}

export function searchAnime(query: string, page = 1, perPage = 20, signal?: AbortSignal) {
  return apiRequest<AnimePageResponse>(
    `/api/anime/search?${queryString({ q: query.trim(), page, perPage })}`,
    signal
  );
}

export function getTrendingAnime(page = 1, perPage = 20, signal?: AbortSignal) {
  return apiRequest<AnimePageResponse>(`/api/anime/trending?${queryString({ page, perPage })}`, signal);
}

export function getPopularAnime(page = 1, perPage = 20, signal?: AbortSignal) {
  return apiRequest<AnimePageResponse>(`/api/anime/popular?${queryString({ page, perPage })}`, signal);
}

export function getTopRatedAnime(page = 1, perPage = 20, signal?: AbortSignal) {
  return apiRequest<AnimePageResponse>(`/api/anime/top-rated?${queryString({ page, perPage })}`, signal);
}

export function getSeasonalAnime(season: AnimeSeason, year: number, page = 1, perPage = 20, signal?: AbortSignal) {
  return apiRequest<AnimePageResponse>(
    `/api/anime/seasonal?${queryString({ season, year, page, perPage })}`,
    signal
  );
}

export function browseAnime(filters: BrowseFilters, page = 1, perPage = 20, signal?: AbortSignal) {
  return apiRequest<AnimePageResponse>(
    `/api/anime/browse?${queryString({ ...filters, page, perPage })}`,
    signal
  );
}

export async function getAnimeDetails(id: number, signal?: AbortSignal): Promise<AnimeDetails> {
  const response = await apiRequest<{ success: true; data: AnimeDetails }>(`/api/anime/${id}`, signal);
  return response.data;
}
