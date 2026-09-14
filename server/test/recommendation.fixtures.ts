import { normalizeAnime } from '../src/services/anilist.service.js';
import type { AnimeListServiceContract } from '../src/services/anilist.service.js';
import type { SignalDataset } from '../src/services/recommendation.engine.js';
export const now = Date.parse('2026-09-14T00:00:00Z');
export const stamp = '2026-09-14T00:00:00Z';
export const summary = (id: number, genres: string[] = ['Action']) => normalizeAnime({ id, title: { english: `Anime ${id}` }, genres, averageScore: 80, popularity: 100, isAdult: false });
export const empty = (): SignalDataset => ({ favorites: [], watchlist: [], progress: [], viewed: [], history: [] });
export const favorite = (id: number, genres: string[] = ['Action']) => ({ id, anilistId: id, title: `Anime ${id}`, genres, addedAt: stamp });
export const episode = (id: number, n: number, genres: string[] = ['Action'], total = 100) => ({ anilistId: id, episodeNumber: n, totalEpisodes: total, title: `Anime ${id}`, genres, currentTime: 100, duration: 100, percentage: 100, completed: true, malId: null, coverImage: null, providerId: null, language: null, firstWatchedAt: stamp, lastWatchedAt: stamp, completedAt: stamp });
export function catalog(onCall: () => void = () => {}) {
  const page = async () => { onCall(); return { data: [summary(101), summary(102, ['Romance']), summary(103, ['Comedy']), summary(104, ['Action'])], pagination: { page: 1, perPage: 25, total: 4, hasNextPage: false } }; };
  return { popular: page, topRated: page, browse: page, trending: page, seasonal: page, search: page, details: async (id: number) => { onCall(); return { ...summary(id), synonyms: [], source: null, countryOfOrigin: null, startDate: { year: null, month: null, day: null }, endDate: { year: null, month: null, day: null }, trailer: null, recommendations: [summary(id === 1 ? 101 : 102, id === 1 ? ['Action'] : ['Romance'])], relatedAnime: [{ ...summary(105), relationType: 'SEQUEL' }] }; } } as AnimeListServiceContract;
}
