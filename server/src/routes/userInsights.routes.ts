import { displayGenre, genrePreferences, normalizeSignals } from "../services/recommendation.engine.js";
import { Router } from "express";
import type { UserRepositories } from "../repositories/repositoryFactory.js";
import { AniListService, type AnimeListServiceContract } from "../services/anilist.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/appError.js";

const owner = (request: AuthenticatedRequest) => {
  if (!request.authUser) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
  return request.authUser.id;
};
export function createUserInsightsRouter(repositories: UserRepositories, anime: AnimeListServiceContract = new AniListService()) {
  const router = Router();
  router.get("/stats", async (request: AuthenticatedRequest, response, next) => {
    try {
      const user = owner(request);
      const [favorites, watchlist, episodes, history, viewed] = await Promise.all([
        repositories.library.favorites(user), repositories.library.watchlist(user), repositories.playback.allProgress(user), repositories.playback.history(user, 250), repositories.library.recentlyViewed(user, 250)
      ]);
      const topGenres = genrePreferences(normalizeSignals({ favorites, watchlist, progress: episodes, history, viewed }, Date.now())).slice(0, 8).map(g => ({ ...g, genre: displayGenre(g.genre) }));
      response.json({ success: true, data: {
        favorites: favorites.length, watchlist: watchlist.length, watching: watchlist.filter((item) => item.status === "WATCHING").length,
        completedAnime: watchlist.filter((item) => item.status === "COMPLETED").length, completedEpisodes: episodes.filter((item) => item.completed).length,
        inProgressEpisodes: episodes.filter((item) => !item.completed && item.currentTime > 0).length,
        estimatedWatchSeconds: episodes.reduce((sum, item) => sum + (item.completed ? item.duration : item.currentTime), 0),
        topGenres, recentActivity: history.slice(0, 8)
      }});
    } catch (error) { next(error); }
  });
  return router;
}
