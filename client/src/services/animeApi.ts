import type { AnimeDetails, AnimePageResponse, AnimeSeason, BrowseFilters } from "../types/anime";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type ApiErrorBody = { success?: false; error?: { code?: string; message?: string } };

export class AnimeApiError extends Error {
  constructor(
    message: string,
    public readonly code = "NETWORK_ERROR",
    public readonly status = 0
  ) {
    super(message);
  }
}

async function apiRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AnimeApiError("We couldn't reach AniVerse. Check your connection and try again.");
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new AnimeApiError("AniVerse returned an unexpected response.", "INVALID_RESPONSE", response.status);
  }

  if (!response.ok) {
    const apiError = body as ApiErrorBody;
    throw new AnimeApiError(
      apiError.error?.message ?? "We couldn't load anime information right now. Please try again.",
      apiError.error?.code,
      response.status
    );
  }

  return body as T;
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
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
