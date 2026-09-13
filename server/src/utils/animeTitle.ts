import type { AnimeSummary } from "../types/anime.types.js";

export function getAnimeTitle(anime: Pick<AnimeSummary, "title">): string {
  return anime.title.english || anime.title.romaji || anime.title.native || "Untitled anime";
}
