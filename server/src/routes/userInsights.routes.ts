import { pageLimit, validateSetting } from "../utils/validation.js";
import { Router } from "express";
import type { UserRepositories } from "../repositories/repositoryFactory.js";
import { AniListService, type AnimeListServiceContract } from "../services/anilist.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/appError.js";

const owner = (request: AuthenticatedRequest) => {
  if (!request.authUser) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
  return request.authUser.id;
};
const listGenres = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
};

export function createUserInsightsRouter(repositories: UserRepositories, anime: AnimeListServiceContract = new AniListService()) {
  const router = Router();
  router.get("/stats", async (request: AuthenticatedRequest, response, next) => {
    try {
      const user = owner(request);
      const [favorites, watchlist, episodes, history] = await Promise.all([
        repositories.library.favorites(user), repositories.library.watchlist(user), repositories.playback.allProgress(user), repositories.playback.history(user, 250)
      ]);
      const weights = new Map<string, number>();
      for (const item of favorites) for (const genre of listGenres(item.genres)) weights.set(genre, (weights.get(genre) ?? 0) + 3);
      for (const item of watchlist) for (const genre of listGenres(item.genres)) weights.set(genre, (weights.get(genre) ?? 0) + (item.status === "WATCHING" ? 2 : 1));
      for (const item of episodes) for (const genre of listGenres(item.genres)) weights.set(genre, (weights.get(genre) ?? 0) + (item.completed ? 5 : 4));
      response.json({ success: true, data: {
        favorites: favorites.length, watchlist: watchlist.length, watching: watchlist.filter((item) => item.status === "WATCHING").length,
        completedAnime: watchlist.filter((item) => item.status === "COMPLETED").length, completedEpisodes: episodes.filter((item) => item.completed).length,
        inProgressEpisodes: episodes.filter((item) => !item.completed && item.currentTime > 0).length,
        estimatedWatchSeconds: episodes.reduce((sum, item) => sum + (item.completed ? item.duration : item.currentTime), 0),
        topGenres: [...weights].map(([genre, score]) => ({ genre, score })).sort((a, b) => b.score - a.score).slice(0, 8), recentActivity: history.slice(0, 8)
      }});
    } catch (error) { next(error); }
  });
  router.get("/recommendations", async (request: AuthenticatedRequest, response, next) => {
    try {
      const user = owner(request), limit = Math.min(pageLimit.parse(request.query.limit??12),20);
      const [favorites, watchlist, episodes] = await Promise.all([repositories.library.favorites(user), repositories.library.watchlist(user), repositories.playback.allProgress(user)]);
      const excluded = new Set([...episodes.filter((item) => item.completed).map((item) => item.anilistId), ...favorites.map((item) => item.anilistId), ...watchlist.map((item) => item.anilistId)]);
      const weights = new Map<string, number>();
      for (const item of favorites) for (const genre of listGenres(item.genres)) weights.set(genre, (weights.get(genre) ?? 0) + 3);
      for (const item of watchlist) for (const genre of listGenres(item.genres)) weights.set(genre, (weights.get(genre) ?? 0) + (item.status === "WATCHING" ? 2 : 1));
      for (const item of episodes) for (const genre of listGenres(item.genres)) weights.set(genre, (weights.get(genre) ?? 0) + (item.completed ? 5 : 4));
      const candidates = (await anime.popular(1, 25)).data;
      const data = candidates.filter((item) => !excluded.has(item.id) && !item.isAdult).map((item) => {
        const genre = item.genres.find((name) => weights.has(name));
        return { anime: item, score: item.genres.reduce((sum, name) => sum + (weights.get(name) ?? 0), 0) + (item.averageScore ?? 0) / 20 + (item.popularity ? 1 : 0), reason: genre ? `Because you like ${genre}` : "Popular with AniVerse viewers" };
      }).sort((a, b) => b.score - a.score).slice(0, limit).map(({ anime: entry, reason }) => ({ anime: entry, reason }));
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });
  router.get("/recommendations/because-you-watched", async (request: AuthenticatedRequest, response, next) => {
    try {
      const user = owner(request), history = await repositories.playback.history(user, 250);
      const source = history.find((item) => item.completed || item.progressPercentage >= 5);
      if (!source) return response.json({ success: true, data: null });
      const details = await anime.details(source.anilistId), title = details.title.english ?? details.title.romaji ?? details.title.native ?? source.title;
      const related = details.recommendations?.length ? details.recommendations : details.relatedAnime;
      response.json({ success: true, data: { sourceAnime: { id: details.id, title, coverImage: details.coverImage.large }, recommendations: related.filter((item) => item.id !== details.id && !item.isAdult).slice(0, 12).map((item) => ({ anime: item, reason: `Recommended for viewers of ${title}` })) } });
    } catch (error) { next(error); }
  });
  return router;
}
