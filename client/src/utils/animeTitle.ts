import type { Anime } from "../types/anime";

export type TitlePreference = "english" | "romaji" | "native";

export function getAnimeTitle(anime: Pick<Anime, "title">, preference: TitlePreference = "english"): string {
  const preferred = preference === "romaji" ? [anime.title.romaji, anime.title.english, anime.title.native] : preference === "native" ? [anime.title.native, anime.title.english, anime.title.romaji] : [anime.title.english, anime.title.romaji, anime.title.native];
  return preferred.find((title): title is string => Boolean(title)) || "Untitled anime";
}
