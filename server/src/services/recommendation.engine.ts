import type { AnimeSummary } from '../types/anime.types.js';
import type { Favorite, WatchlistItem, RecentlyViewed } from '../types/library.types.js';
import type { EpisodeProgress, WatchHistoryEntry } from '../types/progress.types.js';

export const RECOMMENDATION_RULES = Object.freeze({ favorite: 5, completed: 4, progress: 3, watchlist: 2, viewed: 1, maxAnimeWeight: 6, maxSources: 2, maxGenres: 2, pageSize: 25, maxCandidates: 148, maxResults: 20 });
export type SignalDataset = { favorites: Favorite[]; watchlist: WatchlistItem[]; progress: EpisodeProgress[]; viewed: RecentlyViewed[]; history: WatchHistoryEntry[] };
export type AnimeSignal = { id: number; title: string; genres: string[]; favorite: boolean; completed: boolean; watching: boolean; listed: boolean; watched: boolean; strength: number; lastActivity: number | null };
export type ReasonType = 'genre' | 'source_anime' | 'favorite_similarity' | 'continuation' | 'catalog';
export type Recommendation = { anime: AnimeSummary; reason: string; reasonType: ReasonType; explanation: { type: ReasonType; label: string; sourceAnimeId?: number; genre?: string }; personalized: boolean };
export type Candidate = { anime: AnimeSummary; similarities: number[]; continuations: number[]; catalogSource?: 'Popular on AniList' | 'Top rated on AniList' };
export function normalizeGenres(value: unknown): string[] {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return []; } }
  return Array.isArray(value) ? [...new Set(value.filter((g): g is string => typeof g === 'string').map(g => g.trim().toLowerCase()).filter(Boolean))].sort() : [];
}
export function activityTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string' || !value) return null;
  const parsed = Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isFinite(parsed) ? parsed : null;
}
// Recency is a bonus of 0..25%, with a 90-day half-life. Old taste retains its full base weight.
export function recencyMultiplier(timestamp: number | null, now: number): number {
  return timestamp === null ? 1 : 1 + 0.25 / (1 + Math.max(0, now - timestamp) / (90 * 86400000));
}
export function normalizeSignals(data: SignalDataset, now: number): AnimeSignal[] {
  const signals = new Map<number, AnimeSignal>();
  const episodes = new Map<number, { completed: Set<number>; total: number | null }>();
  const add = (row: { anilistId: number; title: string; genres?: unknown }, weight: number, time: unknown) => {
    let s = signals.get(row.anilistId);
    if (!s) { s = { id: row.anilistId, title: row.title, genres: [], favorite: false, completed: false, watching: false, listed: false, watched: false, strength: 0, lastActivity: null }; signals.set(s.id, s); }
    s.genres = [...new Set([...s.genres, ...normalizeGenres(row.genres)])].sort();
    s.strength = Math.max(s.strength, weight);
    const t = activityTime(time); if (t !== null) s.lastActivity = Math.max(s.lastActivity ?? t, t);
    return s;
  };
  for (const row of data.viewed) add(row, RECOMMENDATION_RULES.viewed, row.lastViewedAt);
  for (const row of data.history) if (row.progressPercentage >= 5 || row.completed) add(row, RECOMMENDATION_RULES.progress, row.watchedAt).watched = true;
  for (const row of data.progress) {
    if (row.currentTime < 30 && !row.completed) continue;
    const s = add(row, RECOMMENDATION_RULES.progress, row.lastWatchedAt); s.watched = true; s.watching = true;
    const e = episodes.get(s.id) ?? { completed: new Set<number>(), total: null };
    if (row.completed) e.completed.add(row.episodeNumber);
    if (row.totalEpisodes && row.totalEpisodes > 0) e.total = Math.max(e.total ?? 0, row.totalEpisodes);
    episodes.set(s.id, e);
  }
  for (const row of data.watchlist) { const s = add(row, row.status === 'COMPLETED' ? RECOMMENDATION_RULES.completed : row.status === 'WATCHING' ? RECOMMENDATION_RULES.progress : RECOMMENDATION_RULES.watchlist, row.updatedAt); s.listed = true; s.completed ||= row.status === 'COMPLETED'; s.watching ||= row.status === 'WATCHING'; s.watched ||= row.status === 'COMPLETED'; }
  for (const row of data.favorites) add(row, RECOMMENDATION_RULES.favorite, row.addedAt).favorite = true;
  for (const s of signals.values()) {
    const e = episodes.get(s.id);
    if (e?.total && e.completed.size >= e.total && Array.from({ length: e.total }, (_, i) => i + 1).every(n => e.completed.has(n))) s.completed = true;
    if (s.completed) { s.strength = Math.max(s.strength, RECOMMENDATION_RULES.completed); s.watching = false; }
    s.strength = Math.min(RECOMMENDATION_RULES.maxAnimeWeight, s.strength * recencyMultiplier(s.lastActivity, now));
  }
  return [...signals.values()].sort((a, b) => a.id - b.id);
}
export function genrePreferences(signals: AnimeSignal[]): Array<{ genre: string; score: number }> {
  const weights = new Map<string, number>();
  // Split each title's bounded vote across its genres, so many-genre titles cannot dominate either.
  for (const s of signals) for (const genre of s.genres) weights.set(genre, (weights.get(genre) ?? 0) + s.strength / s.genres.length);
  return [...weights].map(([genre, score]) => ({ genre, score })).sort((a, b) => b.score - a.score || a.genre.localeCompare(b.genre, 'en'));
}
export const displayGenre = (g: string) => g === 'slice of life' ? 'Slice of Life' : g.replace(/\b\w/g, c => c.toUpperCase());
export function sourceSignals(signals: AnimeSignal[]): AnimeSignal[] {
  return signals.filter(s => s.favorite || s.watched || s.completed).sort((a, b) => Number(b.completed) - Number(a.completed) || b.strength - a.strength || (b.lastActivity ?? 0) - (a.lastActivity ?? 0) || a.id - b.id).slice(0, RECOMMENDATION_RULES.maxSources);
}
export function deduplicateCandidates(candidates: Candidate[]): Candidate[] {
  const result = new Map<number, Candidate>();
  for (const c of candidates) {
    if (c.anime.isAdult || !Number.isInteger(c.anime.id)) continue;
    const prior = result.get(c.anime.id);
    if (prior) { prior.similarities = [...new Set([...prior.similarities, ...c.similarities])].sort((a, b) => a - b); prior.continuations = [...new Set([...prior.continuations, ...c.continuations])].sort((a, b) => a - b); }
    else result.set(c.anime.id, { ...c, similarities: [...new Set(c.similarities)], continuations: [...new Set(c.continuations)] });
  }
  return [...result.values()].slice(0, RECOMMENDATION_RULES.maxCandidates);
}
export function rankRecommendations(signals: AnimeSignal[], input: Candidate[], limit: number, kind: 'discovery' | 'similarity' | 'continuation' = 'discovery', sourceId?: number): Recommendation[] {
  const preferences = genrePreferences(signals), sum = preferences.reduce((n, g) => n + g.score, 0);
  const weights = new Map(preferences.map(g => [g.genre, sum ? g.score / sum : 0]));
  const excluded = new Set(signals.filter(s => s.favorite || s.completed || s.listed || s.watching || s.watched).map(s => s.id));
  const pool = deduplicateCandidates(input).filter(c => !excluded.has(c.anime.id) && c.anime.id !== sourceId && (kind === 'continuation' ? c.continuations.length > 0 : c.continuations.length === 0) && (kind !== 'similarity' || c.similarities.includes(sourceId!)));
  const scored = pool.map(c => {
    const matches = normalizeGenres(c.anime.genres).filter(g => weights.has(g)).sort((a, b) => weights.get(b)! - weights.get(a)! || a.localeCompare(b, 'en'));
    const source = signals.filter(s => (kind === 'continuation' ? c.continuations : c.similarities).includes(s.id) && (sourceId === undefined || s.id === sourceId)).sort((a, b) => b.strength - a.strength || a.id - b.id)[0];
    const preferenceScore = matches.reduce((n, g) => n + weights.get(g)!, 0) * (signals.length === 1 ? 20 : 40);
    const similarityScore = source && kind !== 'continuation' ? 15 * source.strength / RECOMMENDATION_RULES.maxAnimeWeight : 0;
    const qualityScore = Math.max(0, Math.min(100, c.anime.averageScore ?? 0)) / 20;
    const continuationScore = kind === 'continuation' ? 50 : 0;
    let type: ReasonType = 'catalog', label: string = c.catalogSource ?? 'Popular on AniList';
    if (kind === 'continuation' && source) { type = 'continuation'; label = `Continue the series after ${source.title}`; }
    else if (source) { type = source.favorite && !source.watched ? 'favorite_similarity' : 'source_anime'; label = source.favorite && !source.watched ? `Similar to your favorite ${source.title}` : `Because you watched ${source.title}`; }
    else if (matches.length) { type = 'genre'; label = `Because you like ${displayGenre(matches[0])}`; }
    return { c, primaryGenre: matches[0] ?? normalizeGenres(c.anime.genres)[0] ?? '', score: preferenceScore + similarityScore + qualityScore + continuationScore, recommendation: { anime: c.anime, reason: label, reasonType: type, explanation: { type, label, ...(source ? { sourceAnimeId: source.id } : {}), ...(type === 'genre' ? { genre: displayGenre(matches[0]) } : {}) }, personalized: type !== 'catalog' } satisfies Recommendation };
  });
  const selected: Recommendation[] = [], genreCounts = new Map<string, number>();
  // Greedy, deterministic diversity penalty: a repeated primary genre loses 3 points per prior pick.
  while (scored.length && selected.length < Math.min(Math.max(limit, 1), RECOMMENDATION_RULES.maxResults)) {
    scored.sort((a, b) => (b.score - 3 * (genreCounts.get(b.primaryGenre) ?? 0)) - (a.score - 3 * (genreCounts.get(a.primaryGenre) ?? 0)) || (b.c.anime.popularity ?? 0) - (a.c.anime.popularity ?? 0) || a.c.anime.id - b.c.anime.id);
    const pick = scored.shift()!; selected.push(pick.recommendation); genreCounts.set(pick.primaryGenre, (genreCounts.get(pick.primaryGenre) ?? 0) + 1);
  }
  return selected;
}
