import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { AnimeListServiceContract } from "../services/anilist.service.js";
import { getCurrentAnimeSeason } from "../utils/currentSeason.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(25).default(20)
});

const searchSchema = paginationSchema.extend({
  q: z.string().trim().min(1, "Enter an anime title to search.").max(100)
});

const seasonSchema = paginationSchema.extend({
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
  year: z.coerce.number().int().min(1940).max(2100).optional()
});

const browseSchema = paginationSchema.extend({
  genre: z.string().trim().min(1).max(50).optional(),
  format: z.enum(["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"]).optional(),
  status: z.enum(["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"]).optional(),
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  year: z.coerce.number().int().min(1940).max(2100).optional(),
  sort: z.enum(["POPULARITY", "TRENDING", "SCORE", "NEWEST", "OLDEST", "TITLE_ASC", "TITLE_DESC"]).default("POPULARITY")
});

function pageResponse(response: Response, result: Awaited<ReturnType<AnimeListServiceContract["popular"]>>) {
  response.json({ success: true, data: result.data, pagination: result.pagination });
}

export function createAnimeController(service: AnimeListServiceContract) {
  return {
    search: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = searchSchema.parse(request.query);
        pageResponse(response, await service.search(query.q, query.page, query.perPage));
      } catch (error) {
        next(error);
      }
    },

    trending: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = paginationSchema.parse(request.query);
        pageResponse(response, await service.trending(query.page, query.perPage));
      } catch (error) {
        next(error);
      }
    },

    popular: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = paginationSchema.parse(request.query);
        pageResponse(response, await service.popular(query.page, query.perPage));
      } catch (error) {
        next(error);
      }
    },

    seasonal: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = seasonSchema.parse(request.query);
        const current = getCurrentAnimeSeason();
        const season = query.season ?? current.season;
        const year = query.year ?? current.year;
        const result = await service.seasonal(season, year, query.page, query.perPage);
        response.json({
          success: true,
          data: result.data,
          pagination: result.pagination,
          filters: { season, year }
        });
      } catch (error) {
        next(error);
      }
    },

    browse: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = browseSchema.parse(request.query);
        const { page, perPage, ...filters } = query;
        pageResponse(response, await service.browse(filters, page, perPage));
      } catch (error) {
        next(error);
      }
    },

    details: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const id = z.coerce.number().int().positive().parse(request.params.id);
        response.json({ success: true, data: await service.details(id) });
      } catch (error) {
        next(error);
      }
    }
  };
}
