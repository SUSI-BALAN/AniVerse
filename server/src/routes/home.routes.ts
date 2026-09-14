import { Router } from 'express';
import type { UserRepositories } from '../repositories/repositoryFactory.js';
import { AniListService, type AnimeListServiceContract } from '../services/anilist.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import { HomeService } from '../services/home.service.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { AppError } from '../utils/appError.js';
import { z } from 'zod';
export function createHomeRouter(repositories: UserRepositories, anime: AnimeListServiceContract = new AniListService()) {
  const router = Router(), home = new HomeService(repositories, new RecommendationService(anime, repositories));
  router.get('/home', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      const scope = z.enum(['all', 'personalized', 'activity']).parse(req.query.scope ?? 'all');
      res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: await home.get(req.authUser.id, scope) });
    } catch (error) { next(error); }
  });
  return router;
}
