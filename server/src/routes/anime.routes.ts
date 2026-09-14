import { Router } from "express";
import { createAnimeController } from "../controllers/anime.controller.js";
import { AniListService, type AnimeListServiceContract } from "../services/anilist.service.js";

export const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller"
] as const;

export function createAnimeRouter(service: AnimeListServiceContract = new AniListService()) {
  const router = Router();
  const controller = createAnimeController(service);

  router.get("/search", controller.search);
  router.get("/trending", controller.trending);
  router.get("/popular", controller.popular);
  router.get("/top-rated", controller.topRated);
  router.get("/seasonal", controller.seasonal);
  router.get("/browse", controller.browse);
  router.get("/genres", (_, response) => response.json({ success: true, data: ANIME_GENRES }));
  router.get("/:id", controller.details);

  return router;
}
