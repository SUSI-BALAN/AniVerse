import type { AnimeSummary } from '../types/anime.types.js';
import type { EpisodeProgress } from '../types/progress.types.js';
import type { UserRepositories } from '../repositories/repositoryFactory.js';
import type { RecommendationService } from './recommendation.service.js';
import type { Recommendation } from './recommendation.engine.js';

export const HOME_LIMIT = 10;
export type Section<T> = { status: 'ready'; data: T } | { status: 'error'; data: null; message: string };
export function compactAnime(a: AnimeSummary) {
  return { id: a.id, title: { english: a.title.english?.slice(0, 240) ?? null, romaji: a.title.romaji?.slice(0, 240) ?? null, native: a.title.native?.slice(0, 240) ?? null }, coverImage: { large: a.coverImage.large, extraLarge: null, color: null }, genres: a.genres.slice(0, 8), format: a.format, seasonYear: a.seasonYear, averageScore: a.averageScore, episodes: a.episodes };
}
function uniqueProgress(rows: EpisodeProgress[]) {
  const seen = new Set<number>();
  return rows.filter(r => { if (seen.has(r.anilistId)) return false; seen.add(r.anilistId); return true; }).slice(0, HOME_LIMIT).map(r => ({ anilistId: r.anilistId, episodeNumber: r.episodeNumber, title: r.title, coverImage: r.coverImage, currentTime: r.currentTime, duration: r.duration, percentage: r.percentage, completed: Boolean(r.completed), lastWatchedAt: r.lastWatchedAt, completedAt: r.completedAt }));
}
async function section<T>(load: () => Promise<T>, message: string): Promise<Section<T>> {
  try { return { status: 'ready', data: await load() }; }
  catch { return { status: 'error', data: null, message }; }
}
export class HomeService {
  constructor(private readonly repositories: UserRepositories, private readonly recommendations: RecommendationService) {}
  async get(user: string, scope: 'all' | 'personalized' | 'activity' = 'all') {
    const [profile, continueWatching, recentlyCompleted, recommendations] = await Promise.all([
      scope === 'all' ? section(async () => { const p = await this.repositories.profile?.getProfile(user); return { displayName: p?.createdAt ? p.displayName : null }; }, 'Your greeting is temporarily unavailable.') : undefined,
      scope !== 'personalized' ? section(async () => uniqueProgress(await this.repositories.playback.continueWatching(user, HOME_LIMIT)), 'Continue Watching is temporarily unavailable.') : undefined,
      scope !== 'personalized' ? section(async () => uniqueProgress(await this.repositories.playback.recentlyCompleted(user, HOME_LIMIT)), 'Recently Completed is temporarily unavailable.') : undefined,
      section(() => this.recommendations.getBundle(user), 'Recommendations are temporarily unavailable.')
    ]);
    if (recommendations.status === 'error') return { profile, continueWatching, recentlyCompleted, personalized: recommendations };
    const b = recommendations.data, used = new Set(continueWatching?.data?.map(r => r.anilistId));
    const take = (rows: Recommendation[]) => {
      const picked: Recommendation[] = [];
      for (const r of rows) { if (used.has(r.anime.id)) continue; used.add(r.anime.id); picked.push(r); if (picked.length === HOME_LIMIT) break; }
      return picked.map(r => ({ ...r, anime: compactAnime(r.anime) }));
    };
    // Higher-priority rails receive first choice. Only presentation allocation changes ranking.
    const continuations = take(b.continuations);
    const items = take(b.recommendations);
    const because = b.because && { sourceAnime: b.because.sourceAnime, recommendations: take(b.because.recommendations) };
    const favoriteGenres = b.genreDiscovery && { genre: b.genreDiscovery.genre, recommendations: take(b.genreDiscovery.recommendations) };
    return { profile, continueWatching, recentlyCompleted, personalized: { status: 'ready' as const, data: { recommendations: items, continuations, because, favoriteGenres, audience: b.meta.signalCount === 0 ? 'cold' : b.meta.signalCount <= 2 ? 'light' : 'established', meta: { ...b.meta, personalized: items.some(r => r.personalized) } } } };
  }
}
