import { useCallback } from "react";
import { Link } from "react-router-dom";
import { AnimeHero } from "../components/AnimeHero";
import { AnimeSection } from "../components/AnimeSection";
import { ANIME_GENRES, getCurrentAnimeSeason } from "../constants/anime";
import { useAnimePage } from "../hooks/useAnimePage";
import { getPopularAnime, getSeasonalAnime, getTrendingAnime, getTopRatedAnime } from "../services/animeApi";
import { useEffect, useState } from "react";
import { progressApi } from "../services/progressApi";
import type { EpisodeProgress } from "../types/progress";
import { ContinueWatchingCard } from "../components/ContinueWatchingCard";
import { insightsApi } from "../services/insightsApi";
import { useRecommendations } from "../hooks/useRecommendations";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const auth = useAuth();
  const canLoadPrivate = auth.mode === "local" || Boolean(auth.user);
  const [continueWatching, setContinueWatching] = useState<EpisodeProgress[]>([]);
  const personalized = useRecommendations();
  const [stats, setStats] = useState<import("../services/insightsApi").Stats | null>(null);
  const because = personalized.data?.because;
  const [completed, setCompleted] = useState<EpisodeProgress[]>([]);
  useEffect(() => { if(!canLoadPrivate){setContinueWatching([]);return;}progressApi.continueWatching().then((items) => setContinueWatching(items.slice(0, 10))).catch(() => setContinueWatching([])); }, [canLoadPrivate]);

  useEffect(() => { if(!canLoadPrivate){setStats(null);return;}insightsApi.stats().then(setStats).catch(() => setStats(null)); }, [canLoadPrivate]);
  useEffect(() => { if(!canLoadPrivate){setCompleted([]);return;} progressApi.recentlyCompleted().then(setCompleted).catch(() => setCompleted([])); }, [canLoadPrivate]);
  const current = getCurrentAnimeSeason();
  const trendingFetcher = useCallback((signal: AbortSignal) => getTrendingAnime(1, 20, signal), []);
  const popularFetcher = useCallback((signal: AbortSignal) => getPopularAnime(1, 20, signal), []);
  const seasonalFetcher = useCallback((signal: AbortSignal) => getSeasonalAnime(current.season, current.year, 1, 20, signal), [current.season, current.year]);
  const topRatedFetcher = useCallback((signal: AbortSignal) => getTopRatedAnime(1, 20, signal), []);
  const trending = useAnimePage(trendingFetcher, []);
  const popular = useAnimePage(popularFetcher, []);
  const seasonal = useAnimePage(seasonalFetcher, [current.season, current.year]);
  const topRatedPage = useAnimePage(topRatedFetcher, []);

  return (
    <div>
      <AnimeHero anime={trending.anime.length ? trending.anime : popular.anime} loading={trending.loading && popular.loading} />
      <div className="mx-auto max-w-page px-4 pb-12 sm:px-6 lg:px-8 xl:px-10">
        {continueWatching.length > 0 && <section className="border-b border-outline py-10" aria-labelledby="continue-heading"><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase text-accent-secondary">Pick up where you left off</p><h2 id="continue-heading" className="mt-2 text-2xl font-black text-foreground">Continue Watching</h2></div></div><div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-none">{continueWatching.map((item) => <ContinueWatchingCard key={`${item.anilistId}-${item.episodeNumber}`} item={item} />)}</div></section>}
        {canLoadPrivate && <AnimeSection title={personalized.data?.meta.personalized ? "For You" : "Popular Picks"} subtitle={personalized.data?.meta.personalized ? "Based on your library and watch activity" : "Catalog picks while we learn your taste"} anime={(personalized.data?.recommendations ?? []).map(r => r.anime)} reasons={personalized.reasons(personalized.data?.recommendations)} loading={personalized.loading} error={personalized.error} onRetry={personalized.retry} viewAllLink="/browse" />}
        {personalized.data?.meta.partial && <p role="status" className="text-sm text-muted">Some recommendation sources are unavailable. Showing available picks.</p>}
        {personalized.data?.continuations.length ? <AnimeSection title="Continue the Series" subtitle="Sequels to completed titles" anime={personalized.data.continuations.map(r => r.anime)} reasons={personalized.reasons(personalized.data.continuations)} loading={false} /> : null}
        {because && because.recommendations.length > 0 && <AnimeSection title={`Because You Watched ${because.sourceAnime.title}`} subtitle="Title recommendations from AniList" anime={because.recommendations.map(r => r.anime)} reasons={personalized.reasons(because.recommendations)} loading={false} viewAllLink="/browse" />}
        {stats?.topGenres.length ? <section className="border-b border-outline py-10"><p className="text-xs font-black uppercase text-accent-secondary">Based on your library</p><h2 className="mt-2 text-2xl font-black text-foreground">Your Favorite Genres</h2><div className="mt-5 flex flex-wrap gap-2">{stats.topGenres.slice(0, 5).map((item) => <Link key={item.genre} to={`/browse?genre=${encodeURIComponent(item.genre)}`} className="rounded-md border border-outline bg-surface px-3 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-foreground">{item.genre}</Link>)}</div></section> : null}
        {completed.length > 0 && <section className="border-b border-outline py-10"><h2 className="text-2xl font-black text-foreground">Recently Completed</h2><div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-none">{completed.slice(0, 10).map((item) => <ContinueWatchingCard key={`${item.anilistId}-${item.episodeNumber}`} item={item} />)}</div></section>}
        <AnimeSection title="Trending Now" subtitle="The titles everyone is talking about" anime={trending.anime} loading={trending.loading} error={trending.error} onRetry={trending.retry} viewAllLink="/trending" />
        <AnimeSection title="Popular This Season" subtitle={`${titleCase(current.season)} ${current.year}`} anime={seasonal.anime} loading={seasonal.loading} error={seasonal.error} onRetry={seasonal.retry} viewAllLink="/seasonal" />
        <AnimeSection title="Top Rated" subtitle="Standout favorites from the catalog" anime={topRatedPage.anime.slice(0, 12)} loading={topRatedPage.loading} error={topRatedPage.error} onRetry={topRatedPage.retry} viewAllLink="/browse?sort=SCORE" />
        <AnimeSection title="More To Explore" subtitle="Popular anime for your next watch" anime={popular.anime.slice(6)} loading={popular.loading} error={popular.error} onRetry={popular.retry} viewAllLink="/browse" />
        <section className="border-t border-outline py-10" aria-labelledby="genres-heading">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase text-accent-secondary">Find your mood</p><h2 id="genres-heading" className="mt-2 text-2xl font-black text-foreground">Browse by genre</h2></div>
          <div className="mt-6 flex flex-wrap gap-2">{ANIME_GENRES.map((genre) => <Link key={genre} to={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-md border border-outline bg-surface px-3 py-2 text-sm font-medium text-muted transition hover:border-white/25 hover:text-foreground">{genre}</Link>)}</div>
        </section>
      </div>
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
