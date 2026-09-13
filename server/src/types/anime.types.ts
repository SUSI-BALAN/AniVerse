export type AnimeTitle = {
  romaji: string | null;
  english: string | null;
  native: string | null;
};

export type AnimeImage = {
  large: string | null;
  extraLarge: string | null;
  color: string | null;
};

export type AnimeDate = {
  year: number | null;
  month: number | null;
  day: number | null;
};

export type AnimeSummary = {
  id: number;
  malId: number | null;
  title: AnimeTitle;
  description: string | null;
  coverImage: AnimeImage;
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

export type RelatedAnime = AnimeSummary & {
  relationType: string | null;
};

export type AnimeDetails = AnimeSummary & {
  synonyms: string[];
  source: string | null;
  countryOfOrigin: string | null;
  startDate: AnimeDate;
  endDate: AnimeDate;
  trailer: {
    id: string;
    site: string;
    thumbnail: string | null;
  } | null;
  relatedAnime: RelatedAnime[];
  recommendations: AnimeSummary[];
};

export type AnimeSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type AnimeSort = "POPULARITY" | "TRENDING" | "SCORE" | "NEWEST" | "OLDEST" | "TITLE_ASC" | "TITLE_DESC";

export type Pagination = {
  page: number;
  perPage: number;
  hasNextPage: boolean;
  total: number;
};

export type AnimePage = {
  data: AnimeSummary[];
  pagination: Pagination;
};

export type BrowseFilters = {
  genre?: string;
  format?: string;
  status?: string;
  year?: number;
  season?: AnimeSeason;
  minScore?: number;
  sort?: AnimeSort;
};
