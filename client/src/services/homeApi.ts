import { apiFetch } from './apiClient';
import type { Anime } from '../types/anime';
import type { EpisodeProgress } from '../types/progress';
import type { Recommendation } from './insightsApi';
export type HomeSection<T> = { status: 'ready'; data: T } | { status: 'error'; data: null; message: string };
export type PersonalizedHome = { recommendations: Recommendation[]; continuations: Recommendation[]; because: { sourceAnime: { id: number; title: string }; recommendations: Recommendation[] } | null; favoriteGenres: { genre: string; recommendations: Recommendation[] } | null; audience: 'cold' | 'light' | 'established'; meta: { personalized: boolean; partial: boolean; failedSources: number } };
export type HomeSummary = { profile?: HomeSection<{ displayName: string | null }>; continueWatching?: HomeSection<EpisodeProgress[]>; recentlyCompleted?: HomeSection<EpisodeProgress[]>; personalized: HomeSection<PersonalizedHome> };
export type HomeScope = 'all' | 'personalized' | 'activity';
export const homeApi = { async get(signal: AbortSignal, scope: HomeScope = 'all'): Promise<HomeSummary> {
  const response = await apiFetch(`/api/home${scope === 'all' ? '' : '?scope=' + scope}`, { signal });
  if (!response.ok) throw new Error('Your home is temporarily unavailable. Please retry.');
  const body = await response.json() as { data: HomeSummary };
  const p = body.data.personalized.data;
  // Rail summaries omit large fields. Restore honest null/default metadata for the shared card model.
  const normalize = (rows: Recommendation[]) => rows.map(r => ({ ...r, anime: Object.assign({ malId: null, description: null, bannerImage: null, status: null, season: null, duration: null, popularity: null, trending: null, studios: [], isAdult: false }, r.anime) as Anime }));
  if (p) { p.recommendations = normalize(p.recommendations); p.continuations = normalize(p.continuations); if (p.because) p.because.recommendations = normalize(p.because.recommendations); if (p.favoriteGenres) p.favoriteGenres.recommendations = normalize(p.favoriteGenres.recommendations); }
  return body.data;
} };
