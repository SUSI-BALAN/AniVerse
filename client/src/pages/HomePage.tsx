import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimeHero } from '../components/AnimeHero';
import { AnimeSection } from '../components/AnimeSection';
import { ContinueWatchingCard } from '../components/ContinueWatchingCard';
import { ErrorState } from '../components/PageState';
import { ANIME_GENRES, getCurrentAnimeSeason } from '../constants/anime';
import { useAnimePage } from '../hooks/useAnimePage';
import { useHomeSummary } from '../hooks/useHomeData';
import { getPopularAnime, getSeasonalAnime, getTrendingAnime, getTopRatedAnime } from '../services/animeApi';
import type { HomeSection } from '../services/homeApi';
import type { EpisodeProgress } from '../types/progress';

function ProgressSection({ title, section, retry }: { title: string; section?: HomeSection<EpisodeProgress[]>; retry: () => void }) {
  if (!section || section.status === 'ready' && !section.data.length) return null;
  return <section className="border-b border-outline py-8" aria-label={title}><h2 className="text-xl font-black text-foreground sm:text-2xl">{title}</h2>{section.status === 'error' ? <ErrorState message={section.message} onRetry={retry} compact /> : <div className="mt-5 flex gap-4 overflow-x-auto pb-3" tabIndex={0} aria-label={`${title} titles`}>{section.data.map(item => <ContinueWatchingCard key={item.anilistId} item={item} showActivity />)}</div>}</section>;
}

export function HomePage() {
  const home = useHomeSummary();
  const current = getCurrentAnimeSeason();
  const trendingFetcher = useCallback((signal: AbortSignal) => getTrendingAnime(1, 10, signal), []);
  const popularFetcher = useCallback((signal: AbortSignal) => getPopularAnime(1, 10, signal), []);
  const seasonalFetcher = useCallback((signal: AbortSignal) => getSeasonalAnime(current.season, current.year, 1, 10, signal), [current.season, current.year]);
  const topRatedFetcher = useCallback((signal: AbortSignal) => getTopRatedAnime(1, 10, signal), []);
  const trending = useAnimePage(trendingFetcher, []), popular = useAnimePage(popularFetcher, []), seasonal = useAnimePage(seasonalFetcher, [current.season, current.year]), topRated = useAnimePage(topRatedFetcher, []);
  const [slowPublic, setSlowPublic] = useState(false);
  const publicLoading = trending.loading || popular.loading || seasonal.loading || topRated.loading;
  useEffect(() => { if (!publicLoading) { setSlowPublic(false); return; } const timer = window.setTimeout(() => setSlowPublic(true), 4000); return () => window.clearTimeout(timer); }, [publicLoading]);
  const p = home.data?.personalized.data;
  const greeting = home.data?.profile?.data?.displayName;
  const hero = trending.anime.length ? { anime: trending.anime, label: 'Trending spotlight' } : seasonal.anime.length ? { anime: seasonal.anime, label: 'Seasonal spotlight' } : { anime: popular.anime, label: 'Popular spotlight' };
  const catalog = (title: string, subtitle: string, page: typeof trending, link: string) => page.loading || page.error || page.anime.length ? <AnimeSection title={title} subtitle={subtitle} anime={page.anime} loading={page.loading} error={page.error} onRetry={page.retry} viewAllLink={link} /> : null;
  return <div>
    <AnimeHero anime={hero.anime} loading={!hero.anime.length && publicLoading} spotlightLabel={hero.label} />
    <div className="mx-auto max-w-page px-4 pb-12 sm:px-6 lg:px-8 xl:px-10">
      {(slowPublic && publicLoading || home.slow && home.loading) && <p role="status" className="py-4 text-sm text-muted">AniVerse is taking a little longer to load. The server may be starting up.</p>}
      {greeting && <p className="pt-6 text-lg font-semibold text-foreground">Welcome back, {greeting}</p>}
      {p?.audience === 'cold' && <aside className="mt-6 rounded-md border border-outline bg-surface p-4" aria-label="Personalize your home"><p className="text-sm text-muted">Add favorites or start watching anime to personalize your home.</p><Link className="mt-2 inline-flex min-h-9 items-center font-semibold text-accent-secondary" to="/browse">Browse anime</Link></aside>}
      <ProgressSection title="Continue Watching" section={home.data?.continueWatching} retry={home.retry} />
      {home.enabled && !home.data && home.loading && <div aria-busy="true"><span className="sr-only" role="status">Loading your home</span><AnimeSection title="Your Home" anime={[]} loading /></div>}
      {home.enabled && (home.error || home.data?.personalized.status === 'error') && <section className="py-8" aria-label="Your Recommendations"><h2 className="mb-4 text-xl font-black text-foreground">Your Recommendations</h2><ErrorState message={home.error ?? 'Recommendations are temporarily unavailable.'} onRetry={home.retry} compact /></section>}
      {p?.meta.partial && <p role="status" className="py-3 text-sm text-muted">Some recommendation sources are unavailable. Showing available picks.</p>}
      {p?.continuations.length ? <AnimeSection title="Continue the Series" subtitle="Sequels to completed titles" anime={p.continuations.map(r => r.anime)} reasons={home.reasons(p.continuations)} loading={false} /> : null}
      {p?.recommendations.length ? <AnimeSection title={p.meta.personalized ? 'For You' : 'Popular Picks'} subtitle={p.meta.personalized ? p.audience === 'light' ? 'A few picks based on your recent activity' : 'Based on your library and watch activity' : 'Catalog picks to get you started'} anime={p.recommendations.map(r => r.anime)} reasons={home.reasons(p.recommendations)} loading={false} viewAllLink="/browse" /> : null}
      {p?.because?.recommendations.length ? <AnimeSection title={`Because You Watched ${p.because.sourceAnime.title}`} subtitle="Title recommendations from AniList" anime={p.because.recommendations.map(r => r.anime)} reasons={home.reasons(p.because.recommendations)} loading={false} /> : null}
      {p?.favoriteGenres?.recommendations.length ? <AnimeSection title={`More ${p.favoriteGenres.genre} you may like`} subtitle="Based on your genre preferences" anime={p.favoriteGenres.recommendations.map(r => r.anime)} reasons={home.reasons(p.favoriteGenres.recommendations)} loading={false} viewAllLink={`/browse?genre=${encodeURIComponent(p.favoriteGenres.genre)}`} /> : null}
      <ProgressSection title="Recently Completed" section={home.data?.recentlyCompleted} retry={home.retry} />
      {catalog('Trending Now', 'Trending on AniList', trending, '/trending')}
      {catalog('Popular', 'Popular on AniList', popular, '/browse?sort=POPULARITY')}
      {catalog('Seasonal', `${current.season.charAt(0) + current.season.slice(1).toLowerCase()} ${current.year}`, seasonal, '/seasonal')}
      {catalog('Top Rated', 'Score-ordered catalog picks', topRated, '/browse?sort=SCORE')}
      <section className="border-t border-outline py-8" aria-labelledby="genres-heading"><h2 id="genres-heading" className="text-xl font-black text-foreground sm:text-2xl">Browse by genre</h2><div className="mt-5 flex flex-wrap gap-2">{ANIME_GENRES.map(genre => <Link key={genre} to={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-md border border-outline bg-surface px-3 py-2 text-sm font-medium text-muted hover:border-white/25 hover:text-foreground">{genre}</Link>)}</div></section>
    </div>
  </div>;
}
