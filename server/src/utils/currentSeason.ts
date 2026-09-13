import type { AnimeSeason } from "../types/anime.types.js";

export function getCurrentAnimeSeason(date = new Date()): { season: AnimeSeason; year: number } {
  const month = date.getMonth();
  const seasons: AnimeSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

  return {
    season: seasons[Math.floor(month / 3)],
    year: date.getFullYear()
  };
}
