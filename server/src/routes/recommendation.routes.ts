import { Router } from 'express';
import { pageLimit } from '../utils/validation.js';
import { AniListService, type AnimeListServiceContract } from '../services/anilist.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import type { UserRepositories } from '../repositories/repositoryFactory.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { AppError } from '../utils/appError.js';

export function createRecommendationRouter(repositories: UserRepositories, anime: AnimeListServiceContract = new AniListService()) {
  const router = Router(), service = new RecommendationService(anime, repositories);
  for (const path of ['/recommendations', '/recommendations/home', '/recommendations/because-you-watched', '/recommendations/continuations']) router.get(path, async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      const limit = Math.min(pageLimit.parse(req.query.limit ?? 12), 20);
      const bundle = await service.getBundle(req.authUser.id);
      const because = bundle.because && { ...bundle.because, recommendations: bundle.because.recommendations.slice(0, limit) };
      const becauseIds = new Set(because?.recommendations.map(r => r.anime.id));
      const homePicks = bundle.recommendations.filter(r => !becauseIds.has(r.anime.id)).slice(0, limit);
      const data = path.endsWith('/home') ? { recommendations: homePicks, because, continuations: bundle.continuations.slice(0, limit), meta: { ...bundle.meta, personalized: homePicks.some(r => r.personalized) } } : path.endsWith('/continuations') ? bundle.continuations.slice(0, limit) : path.endsWith('/because-you-watched') ? because : bundle.recommendations.slice(0, limit);
      res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data, meta: bundle.meta });
    } catch (error) { next(error); }
  });
  return router;
}
