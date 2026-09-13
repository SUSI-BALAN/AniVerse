import type { Anime, AnimeDetails } from "../types/anime";

export const animeFixture: Anime = {
  id: 1,
  malId: 20,
  title: { english: "Naruto", romaji: "Naruto", native: "ナルト" },
  description: "A young ninja pursues his dream.",
  coverImage: { large: "https://example.com/cover.jpg", extraLarge: null, color: null },
  bannerImage: "https://example.com/banner.jpg",
  genres: ["Action", "Adventure"],
  format: "TV",
  status: "FINISHED",
  season: "FALL",
  seasonYear: 2002,
  episodes: 220,
  duration: 23,
  averageScore: 80,
  popularity: 100,
  trending: 10,
  studios: ["Pierrot"],
  isAdult: false
};

export const detailsFixture: AnimeDetails = {
  ...animeFixture,
  synonyms: [],
  source: "MANGA",
  countryOfOrigin: "JP",
  startDate: { year: 2002, month: 10, day: 3 },
  endDate: { year: 2007, month: 2, day: 8 },
  trailer: null,
  relatedAnime: [],
  recommendations: []
};
