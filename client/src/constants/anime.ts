import type { AnimeSeason } from "../types/anime";

export const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller"
] as const;

export const ANIME_SEASONS: AnimeSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

export function getCurrentAnimeSeason(date = new Date()): { season: AnimeSeason; year: number } {
  return { season: ANIME_SEASONS[Math.floor(date.getMonth() / 3)], year: date.getFullYear() };
}
