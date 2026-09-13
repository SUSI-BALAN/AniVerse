export type AnimeSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type AnimeSort = "POPULARITY" | "TRENDING" | "SCORE" | "NEWEST" | "OLDEST" | "TITLE_ASC" | "TITLE_DESC";

export type Anime = {
  id: number;
  malId: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  coverImage: { large: string | null; extraLarge: string | null; color: string | null };
  bannerImage: string | null;
  genres: string[];
  format: string | null;
  status: string | null;
  season: AnimeSeason | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  popularity: number | null;
  trending: number | null;
  studios: string[];
  isAdult: boolean;
};

export type RelatedAnime = Anime & { relationType: string | null };

export type AnimeDetails = Anime & {
  synonyms: string[];
  source: string | null;
  countryOfOrigin: string | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  trailer: { id: string; site: string; thumbnail: string | null } | null;
  relatedAnime: RelatedAnime[];
  recommendations: Anime[];
};

export type Pagination = { page: number; perPage: number; hasNextPage: boolean; total: number };
export type AnimePageResponse = { success: true; data: Anime[]; pagination: Pagination };

export type BrowseFilters = {
  genre?: string;
  format?: string;
  status?: string;
  year?: number;
  season?: AnimeSeason;
  minScore?: number;
  sort?: AnimeSort;
};
