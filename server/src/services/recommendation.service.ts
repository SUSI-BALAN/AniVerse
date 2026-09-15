import type { AnimeListServiceContract } from './anilist.service.js';
import type { UserRepositories } from '../repositories/repositoryFactory.js';
import { AppError } from '../utils/appError.js';
import { deduplicateCandidates, displayGenre, genrePreferences, normalizeSignals, rankRecommendations, RECOMMENDATION_RULES, sourceSignals, type Candidate } from './recommendation.engine.js';
import { logEvent } from '../utils/observability.js';

export class RecommendationService {
  private readonly inFlight = new Map<string, ReturnType<RecommendationService['calculate']>>();
  constructor(private readonly anime: AnimeListServiceContract, private readonly repositories: UserRepositories, private readonly clock: () => number = Date.now) {}
  async signals(user: string) {
    const [favorites, watchlist, progress, viewed, history] = await Promise.all([
      this.repositories.library.favorites(user), this.repositories.library.watchlist(user), this.repositories.playback.allProgress(user), this.repositories.library.recentlyViewed(user, 250), this.repositories.playback.history(user, 250)
    ]);
    return normalizeSignals({ favorites, watchlist, progress, viewed, history }, this.clock());
  }
  getBundle(user: string) {
    const existing = this.inFlight.get(user); if (existing) return existing;
    const promise = this.calculate(user).finally(() => { if (this.inFlight.get(user) === promise) this.inFlight.delete(user); });
    this.inFlight.set(user, promise); return promise;
  }
  private async calculate(user: string) {
    const start = performance.now(), signals = await this.signals(user), sources = sourceSignals(signals);
    const genres = genrePreferences(signals).slice(0, RECOMMENDATION_RULES.maxGenres);
    // Two public pages + at most two genre pages + at most two details calls = six.
    const jobs: Array<() => Promise<Candidate[]>> = [
      async () => (await this.anime.popular(1, RECOMMENDATION_RULES.pageSize)).data.slice(0, 25).map(anime => ({ anime, similarities: [], continuations: [], catalogSource: 'Popular on AniList' })),
      async () => (await this.anime.topRated(1, RECOMMENDATION_RULES.pageSize)).data.slice(0, 25).map(anime => ({ anime, similarities: [], continuations: [], catalogSource: 'Top rated on AniList' }))
    ];
    for (const { genre } of genres) jobs.push(async () => (await this.anime.browse({ genre: displayGenre(genre), sort: 'SCORE' }, 1, 25)).data.slice(0, 25).map(anime => ({ anime, similarities: [], continuations: [], catalogSource: 'Top rated on AniList' })));
    for (const source of sources) jobs.push(async () => {
      const details = await this.anime.details(source.id);
      return [
        ...details.recommendations.slice(0, 12).map(anime => ({ anime, similarities: [source.id], continuations: [] })),
        ...details.relatedAnime.filter(a => a.relationType === 'SEQUEL' && source.completed).slice(0, 12).map(anime => ({ anime, similarities: [], continuations: [source.id] }))
      ];
    });
    const results = await Promise.allSettled(jobs.map(job => Promise.resolve().then(job)));
    const success = results.filter((r): r is PromiseFulfilledResult<Candidate[]> => r.status === 'fulfilled');
    if (!success.length) throw new AppError(503, 'RECOMMENDATIONS_UNAVAILABLE', 'Recommendations are temporarily unavailable. Please try again later.');
    const candidates = deduplicateCandidates(success.flatMap(r => r.value));
    const watched = sources.filter(s => s.watched || s.completed).sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0) || a.id - b.id)[0];
    const because = watched ? { sourceAnime: { id: watched.id, title: watched.title, coverImage: null as string | null }, recommendations: rankRecommendations(signals, candidates, 20, 'similarity', watched.id) } : null;
    const recommendations = rankRecommendations(signals, candidates, 20);
    const favoriteGenre = genres[0];
    const genreDiscovery = favoriteGenre ? { genre: displayGenre(favoriteGenre.genre), recommendations: rankRecommendations(signals, candidates.filter(c => c.anime.genres.some(g => g.trim().toLowerCase() === favoriteGenre.genre)), 20) } : null;
    const metrics = { inputAnimeCount: signals.length, candidateCount: candidates.length, anilistRequestCount: jobs.length, resultCount: recommendations.length, repositoryQueries: 5, durationMs: Math.round(performance.now() - start), fallback: success.length !== jobs.length };
    logEvent('info','recommendation.completed',metrics);
    return { recommendations, because, genreDiscovery, continuations: rankRecommendations(signals, candidates, 20, 'continuation'), meta: { signalCount: signals.filter(s => s.favorite || s.watched || s.listed || s.completed).length, personalized: recommendations.some(r => r.personalized), partial: success.length !== jobs.length, failedSources: jobs.length - success.length }, metrics: { inputAnimeCount: signals.length, candidateCount: candidates.length, catalogCalls: jobs.length, repositoryQueries: 5, durationMs: metrics.durationMs } };
  }
}
