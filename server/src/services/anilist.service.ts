import { createAnimeCacheRepository, type AnimeCacheRepositoryContract } from "../repositories/cache.factory.js";
import type {
  AnimeDetails,
  AnimePage,
  AnimeSeason,
  AnimeSort,
  AnimeSummary,
  BrowseFilters,
  Pagination,
  RelatedAnime
} from "../types/anime.types.js";
import { AppError } from "../utils/appError.js";
import { env } from "../utils/env.js";
import { sanitizeDescription } from "../utils/sanitizeDescription.js";

type JsonObject = Record<string, unknown>;

type AniListPage = {
  pageInfo?: {
    currentPage?: number;
    perPage?: number;
    hasNextPage?: boolean;
    total?: number;
  };
  media?: unknown[];
};

export type AnimeListServiceContract = Pick<
  AniListService,
  "search" | "trending" | "popular" | "topRated" | "seasonal" | "browse" | "details"
>;

const SUMMARY_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { large extraLarge color }
  bannerImage
  genres
  format
  status
  season
  seasonYear
  episodes
  duration
  averageScore
  popularity
  trending
  studios(isMain: true) { nodes { name } }
  isAdult
`;

const PAGE_QUERY = `
  query AnimePage(
    $page: Int,
    $perPage: Int,
    $search: String,
    $sort: [MediaSort],
    $season: MediaSeason,
    $seasonYear: Int,
    $minScore: Int,
    $genre: String,
    $genre_in: [String],
    $format: MediaFormat,
    $format_in: [MediaFormat],
    $status: MediaStatus,
    $status_in: [MediaStatus],
    $yearFrom: FuzzyDateInt,
    $yearTo: FuzzyDateInt
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage perPage hasNextPage total }
      media(
        type: ANIME,
        isAdult: false,
        search: $search,
        sort: $sort,
        season: $season,
        seasonYear: $seasonYear,
        averageScore_greater: $minScore,
        genre: $genre,
        genre_in: $genre_in,
        format: $format,
        format_in: $format_in,
        status: $status,
        status_in: $status_in,
        startDate_greater: $yearFrom,
        startDate_lesser: $yearTo
      ) { ${SUMMARY_FIELDS} }
    }
  }
`;

const DETAILS_QUERY = `
  query AnimeDetails($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${SUMMARY_FIELDS}
      synonyms
      source(version: 3)
      countryOfOrigin
      startDate { year month day }
      endDate { year month day }
      trailer { id site thumbnail }
      relations {
        edges {
          relationType(version: 2)
          node { ${SUMMARY_FIELDS} }
        }
      }
      recommendations(page: 1, perPage: 12, sort: RATING_DESC) {
        nodes {
          mediaRecommendation { ${SUMMARY_FIELDS} }
        }
      }
    }
  }
`;

const sortValues: Record<AnimeSort, string[]> = {
  POPULARITY: ["POPULARITY_DESC"],
  TRENDING: ["TRENDING_DESC"],
  SCORE: ["SCORE_DESC"],
  NEWEST: ["START_DATE_DESC"],
  OLDEST: ["START_DATE"],
  TITLE_ASC: ["TITLE_ROMAJI"],
  TITLE_DESC: ["TITLE_ROMAJI_DESC"]
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDate(value: unknown) {
  const date = asObject(value);
  return {
    year: nullableNumber(date.year),
    month: nullableNumber(date.month),
    day: nullableNumber(date.day)
  };
}

export function normalizeAnime(value: unknown): AnimeSummary {
  const media = asObject(value);
  const title = asObject(media.title);
  const coverImage = asObject(media.coverImage);
  const studios = asObject(media.studios);
  const studioNodes = Array.isArray(studios.nodes) ? studios.nodes : [];

  if (!Number.isInteger(media.id)) {
    throw new AppError(502, "ANILIST_MALFORMED_RESPONSE", "AniList returned incomplete anime information.");
  }

  return {
    id: media.id as number,
    malId: nullableNumber(media.idMal),
    title: {
      romaji: nullableString(title.romaji),
      english: nullableString(title.english),
      native: nullableString(title.native)
    },
    description: sanitizeDescription(nullableString(media.description)),
    coverImage: {
      large: nullableString(coverImage.large),
      extraLarge: nullableString(coverImage.extraLarge),
      color: nullableString(coverImage.color)
    },
    bannerImage: nullableString(media.bannerImage),
    genres: Array.isArray(media.genres) ? media.genres.filter((genre): genre is string => typeof genre === "string") : [],
    format: nullableString(media.format),
    status: nullableString(media.status),
    season: nullableString(media.season) as AnimeSeason | null,
    seasonYear: nullableNumber(media.seasonYear),
    episodes: nullableNumber(media.episodes),
    duration: nullableNumber(media.duration),
    averageScore: nullableNumber(media.averageScore),
    popularity: nullableNumber(media.popularity),
    trending: nullableNumber(media.trending),
    studios: studioNodes
      .map((studio) => nullableString(asObject(studio).name))
      .filter((studio): studio is string => studio !== null),
    isAdult: media.isAdult === true
  };
}

function normalizePage(value: unknown, requestedPage: number, requestedPerPage: number): AnimePage {
  const page = asObject(value) as AniListPage;
  const pageInfo = page.pageInfo ?? {};
  const media = Array.isArray(page.media) ? page.media : [];

  return {
    data: media.map(normalizeAnime),
    pagination: {
      page: pageInfo.currentPage ?? requestedPage,
      perPage: pageInfo.perPage ?? requestedPerPage,
      hasNextPage: pageInfo.hasNextPage ?? false,
      total: pageInfo.total ?? media.length
    }
  };
}

export class AniListService {
  constructor(
    private readonly cache: AnimeCacheRepositoryContract = createAnimeCacheRepository(),
    private readonly fetcher: typeof fetch = globalThis.fetch
  ) {}

  search(query: string, page: number, perPage: number): Promise<AnimePage> {
    return this.coalescedPage({ page, perPage, search: query, sort: ["SEARCH_MATCH", "POPULARITY_DESC"] });
  }

  trending(page: number, perPage: number): Promise<AnimePage> {
    return this.cachedPage(
      `trending:${page}:${perPage}`,
      env.ANILIST_TRENDING_CACHE_TTL_SECONDS,
      { page, perPage, sort: ["TRENDING_DESC", "POPULARITY_DESC"] }
    );
  }

  popular(page: number, perPage: number): Promise<AnimePage> {
    return this.cachedPage(
      `popular:${page}:${perPage}`,
      env.ANILIST_POPULAR_CACHE_TTL_SECONDS,
      { page, perPage, sort: ["POPULARITY_DESC"] }
    );
  }

  topRated(page: number, perPage: number): Promise<AnimePage> {
    return this.cachedPage(`top-rated:${page}:${perPage}`, env.ANILIST_POPULAR_CACHE_TTL_SECONDS, {
      page, perPage, sort: ["SCORE_DESC", "POPULARITY_DESC"]
    });
  }

  seasonal(season: AnimeSeason, year: number, page: number, perPage: number): Promise<AnimePage> {
    return this.cachedPage(
      `seasonal:${season}:${year}:${page}:${perPage}`,
      env.ANILIST_SEASONAL_CACHE_TTL_SECONDS,
      { page, perPage, season, seasonYear: year, sort: ["POPULARITY_DESC"] }
    );
  }

  browse(filters: BrowseFilters, page: number, perPage: number): Promise<AnimePage> {
    return this.coalescedPage({
      page,
      perPage,
      genre: filters.genre,
      genre_in: filters.genres,
      format: filters.format,
      format_in: filters.formats,
      status: filters.status,
      status_in: filters.statuses,
      seasonYear: filters.year,
      yearFrom: filters.yearFrom === undefined ? undefined : filters.yearFrom * 10000 - 1,
      yearTo: filters.yearTo === undefined ? undefined : (filters.yearTo + 1) * 10000,
      season: filters.season,
      minScore: filters.minScore,
      sort: sortValues[filters.sort ?? "POPULARITY"]
    });
  }

  async details(id: number): Promise<AnimeDetails> {
    const cacheKey = `details:${id}`;
    const cached = this.cache.get<AnimeDetails>(cacheKey);
    if (cached) return cached;

    const result = await this.request<{ Media?: unknown }>(DETAILS_QUERY, { id });
    if (!result.Media) {
      throw new AppError(404, "ANIME_NOT_FOUND", "The requested anime could not be found.");
    }

    const media = asObject(result.Media);
    const relations = asObject(media.relations);
    const recommendations = asObject(media.recommendations);
    const relationEdges = Array.isArray(relations.edges) ? relations.edges : [];
    const recommendationNodes = Array.isArray(recommendations.nodes) ? recommendations.nodes : [];
    const trailer = asObject(media.trailer);

    const details: AnimeDetails = {
      ...normalizeAnime(media),
      synonyms: Array.isArray(media.synonyms)
        ? media.synonyms.filter((synonym): synonym is string => typeof synonym === "string")
        : [],
      source: nullableString(media.source),
      countryOfOrigin: nullableString(media.countryOfOrigin),
      startDate: normalizeDate(media.startDate),
      endDate: normalizeDate(media.endDate),
      trailer:
        nullableString(trailer.id) && nullableString(trailer.site)
          ? {
              id: trailer.id as string,
              site: trailer.site as string,
              thumbnail: nullableString(trailer.thumbnail)
            }
          : null,
      relatedAnime: relationEdges.flatMap((edgeValue): RelatedAnime[] => {
        const edge = asObject(edgeValue);
        if (!edge.node) return [];
        return [{ ...normalizeAnime(edge.node), relationType: nullableString(edge.relationType) }];
      }),
      recommendations: recommendationNodes.flatMap((nodeValue): AnimeSummary[] => {
        const recommendation = asObject(nodeValue).mediaRecommendation;
        return recommendation ? [normalizeAnime(recommendation)] : [];
      })
    };

    this.cache.set(cacheKey, details, env.ANILIST_DETAILS_CACHE_TTL_SECONDS, id);
    return details;
  }

  private async cachedPage(cacheKey: string, ttlSeconds: number, variables: JsonObject): Promise<AnimePage> {
    const cached = this.cache.get<AnimePage>(cacheKey);
    if (cached) return cached;

    const page = await this.coalescedPage(variables);
    this.cache.set(cacheKey, page, ttlSeconds);
    return page;
  }

  private async fetchPage(variables: JsonObject): Promise<AnimePage> {
    const result = await this.request<{ Page?: unknown }>(PAGE_QUERY, variables);
    if (!result.Page) {
      throw new AppError(502, "ANILIST_MALFORMED_RESPONSE", "AniList returned an unexpected response.");
    }
    return normalizePage(result.Page, variables.page as number, variables.perPage as number);
  }

  private readonly inFlight = new Map<string, Promise<AnimePage>>();

  private coalescedPage(variables: JsonObject): Promise<AnimePage> {
    const key = JSON.stringify(Object.fromEntries(Object.entries(variables).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, Array.isArray(v) && k !== 'sort' ? [...v].sort() : v])));
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const promise = this.fetchPage(variables).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private async request<T>(query: string, variables: JsonObject): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.ANILIST_TIMEOUT_MS);

    try {
      const response = await this.fetcher(env.ANILIST_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal
      });
      const body = (await response.json().catch(() => null)) as { data?: T; errors?: unknown[] } | null;

      if (!response.ok || !body || body.errors?.length || !body.data) {
        if (response.status === 403 || response.status === 429 || response.status >= 500) {
          throw new AppError(503, "ANILIST_UNAVAILABLE", "AniList is temporarily unavailable. Please try again later.");
        }

        throw new AppError(
          response.status === 404 ? 404 : 502,
          response.status === 404 ? "ANIME_NOT_FOUND" : "ANILIST_ERROR",
          response.status === 404
            ? "The requested anime could not be found."
            : "Unable to load anime information right now."
        );
      }

      return body.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(504, "ANILIST_TIMEOUT", "AniList took too long to respond. Please try again.");
      }
      throw new AppError(502, "ANILIST_ERROR", "Unable to load anime information right now.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
