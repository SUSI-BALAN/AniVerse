import { BookmarkPlus, CalendarDays, Check, ChevronDown, Clock3, Film, Heart, Play, SearchX, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimeDetailsSkeleton } from "../components/AnimeDetailsSkeleton";
import { AnimeImage } from "../components/AnimeImage";
import { AnimeSection } from "../components/AnimeSection";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { GenreBadge } from "../components/GenreBadge";
import { ErrorState } from "../components/PageState";
import { getAnimeDetails } from "../services/animeApi";
import type { AnimeDetails } from "../types/anime";
import { getAnimeTitle } from "../utils/animeTitle";
import { useLibrary } from "../context/LibraryContext";
import { WATCHLIST_STATUSES, type WatchlistStatus } from "../types/library";
import { progressApi } from "../services/progressApi";
import type { EpisodeProgress } from "../types/progress";

export function AnimeDetailsPage() {
  const { id } = useParams();
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invalidId, setInvalidId] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [episodeProgress, setEpisodeProgress] = useState<EpisodeProgress[]>([]);
  const recordedId = useRef<number | null>(null);
  const { settings, isFavorite, favorite, removeFavorite, getWatchlistItem, addToWatchlist, updateWatchlist, removeFromWatchlist, recordViewed } = useLibrary();
  useEffect(() => { const numericId = Number(id); if (Number.isInteger(numericId) && numericId > 0) progressApi.anime(numericId).then(setEpisodeProgress).catch(() => setEpisodeProgress([])); }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    const numericId = Number(id);
    setExpanded(false);
    setListOpen(false);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setInvalidId(true);
      setError(null);
      setLoading(false);
      return () => controller.abort();
    }

    setInvalidId(false);
    setAnime(null);
    setLoading(true);
    setError(null);
    getAnimeDetails(numericId, controller.signal)
      .then(setAnime)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof Error && "status" in reason && reason.status === 404) {
          setInvalidId(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : "We couldn't load this anime right now.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retryKey]);

  useEffect(() => {
    if (anime && recordedId.current !== anime.id) {
      recordedId.current = anime.id;
      void recordViewed(anime);
    }
  }, [anime, recordViewed]);

  if (loading) return <AnimeDetailsSkeleton />;
  if (invalidId) return <div className="page-shell"><EmptyState icon={SearchX} title="Anime not found" description="This anime link is invalid or no longer available." action={<Button to="/browse">Back to browse</Button>} /></div>;
  if (error || !anime) return <div className="page-shell"><ErrorState message={error ?? "Unable to load this anime."} onRetry={() => setRetryKey((key) => key + 1)} /></div>;

  const title = getAnimeTitle(anime, (settings.title_preference as "english" | "romaji" | "native") || "english");
  const listItem = getWatchlistItem(anime.id);
  const alternateTitle = anime.title.native || (anime.title.romaji !== title ? anime.title.romaji : null);
  const descriptionIsLong = (anime.description?.length ?? 0) > 520;
  const info = [
    ["Format", formatValue(anime.format)], ["Status", formatValue(anime.status)], ["Episodes", anime.episodes],
    ["Duration", anime.duration ? `${anime.duration} min` : null], ["Season", anime.season ? `${formatValue(anime.season)} ${anime.seasonYear ?? ""}`.trim() : null],
    ["Year", anime.seasonYear], ["Studio", anime.studios.join(", ")], ["Source", formatValue(anime.source)], ["Country", anime.countryOfOrigin]
  ];
  const completedEpisodes = episodeProgress.filter((item) => item.completed).length;
  const nextEpisode = episodeProgress.filter((item) => !item.completed && item.currentTime > 0).sort((a, b) => b.episodeNumber - a.episodeNumber)[0]?.episodeNumber ?? (completedEpisodes > 0 ? completedEpisodes + 1 : 1);
  const watchLabel = anime.episodes && completedEpisodes >= anime.episodes ? "Watch Again" : nextEpisode > 1 ? `Resume Episode ${nextEpisode}` : "Watch now";

  return (
    <div>
      <section className="relative min-h-[32rem] overflow-hidden border-b border-outline bg-surface">
        {anime.bannerImage ? <AnimeImage src={anime.bannerImage} alt="" eager className="absolute inset-0 h-full w-full object-cover opacity-55" /> : <div className="absolute inset-0 bg-gradient-to-br from-surface-soft to-background" />}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/15" /><div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/25" />
        <div className="relative mx-auto flex min-h-[32rem] max-w-page items-end px-4 pb-10 pt-24 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid w-full gap-6 sm:grid-cols-[170px_1fr] lg:grid-cols-[220px_1fr] lg:gap-9">
            <AnimeImage src={anime.coverImage.extraLarge || anime.coverImage.large} alt={`${title} cover`} eager className="aspect-[2/3] w-36 rounded-md object-cover shadow-2xl ring-1 ring-white/15 sm:w-full" />
            <div className="self-end"><p className="text-xs font-black uppercase text-accent-secondary">{formatValue(anime.format) ?? "Anime"}</p><h1 className="mt-2 max-w-4xl break-words text-3xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>{alternateTitle && <p className="mt-2 break-words text-sm text-zinc-300 sm:text-base">{alternateTitle}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-200">{anime.averageScore && <span className="inline-flex items-center gap-1 font-bold text-amber-300"><Star size={16} fill="currentColor" /> {anime.averageScore}%</span>}{anime.seasonYear && <span className="inline-flex items-center gap-1"><CalendarDays size={16} /> {anime.seasonYear}</span>}{anime.episodes && <span className="inline-flex items-center gap-1"><Film size={16} /> {anime.episodes} episodes</span>}{anime.duration && <span className="inline-flex items-center gap-1"><Clock3 size={16} /> {anime.duration} min</span>}</div>
              <div className="mt-4 flex flex-wrap gap-2">{anime.genres.map((genre) => <Link key={genre} to={`/browse?genre=${encodeURIComponent(genre)}`}><GenreBadge>{genre}</GenreBadge></Link>)}</div>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:flex"><Button to={`/watch/${anime.id}/1`} className="w-full sm:w-auto"><Play size={17} fill="currentColor" /> Watch now</Button><Button variant={isFavorite(anime.id) ? "primary" : "secondary"} aria-pressed={isFavorite(anime.id)} onClick={() => void (isFavorite(anime.id) ? removeFavorite(anime.id) : favorite(anime))} className="w-full sm:w-auto"><Heart size={17} fill={isFavorite(anime.id) ? "currentColor" : "none"} /> {isFavorite(anime.id) ? "Favorited" : "Favorite"}</Button><div className="relative col-span-2 sm:col-span-1"><Button variant="secondary" onClick={() => setListOpen((value) => !value)} aria-expanded={listOpen} aria-haspopup="menu" className="w-full sm:w-auto"><BookmarkPlus size={17} /> {listItem ? formatListStatus(listItem.status) : "My List"} <ChevronDown size={15} /></Button>{listOpen && <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 min-w-48 rounded-md border border-outline bg-surface p-1 shadow-2xl sm:left-auto sm:right-0">{WATCHLIST_STATUSES.map((status) => <button role="menuitem" type="button" key={status} onClick={() => { void (listItem ? updateWatchlist(anime.id, status) : addToWatchlist(anime, status)); setListOpen(false); }} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-muted hover:bg-white/8 hover:text-foreground">{formatListStatus(status)}{listItem?.status === status && <Check size={15} aria-hidden="true" />}</button>)}{listItem && <button role="menuitem" type="button" onClick={() => { void removeFromWatchlist(anime.id); setListOpen(false); }} className="mt-1 flex w-full border-t border-outline px-3 py-2 pt-3 text-left text-sm font-semibold text-rose-300 hover:text-rose-200">Remove from list</button>}</div>}</div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-page px-4 py-10 sm:px-6 lg:px-8 lg:py-14 xl:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.8fr)_minmax(290px,1fr)] lg:gap-16">
          <section><p className="text-xs font-black uppercase text-accent-secondary">Story</p><h2 className="mt-2 text-2xl font-black text-foreground">Overview</h2><div id="anime-overview" className={`mt-5 whitespace-pre-line text-sm leading-7 text-zinc-300 sm:text-base ${descriptionIsLong && !expanded ? "line-clamp-6" : ""}`}>{anime.description ?? "No overview is available for this anime."}</div>{descriptionIsLong && <button type="button" className="mt-4 text-sm font-bold text-accent-secondary hover:text-foreground" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="anime-overview">{expanded ? "Read less" : "Read more"}</button>}</section>
          <section><p className="text-xs font-black uppercase text-accent-secondary">At a glance</p><h2 className="mt-2 text-2xl font-black text-foreground">Information</h2><dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-outline pt-5">{info.map(([label, value]) => value ? <div key={label} className="min-w-0"><dt className="text-xs font-semibold uppercase text-muted">{label}</dt><dd className="mt-1 break-words text-sm text-foreground">{value}</dd></div> : null)}</dl></section>
        </div>
        {anime.relatedAnime.length > 0 && <AnimeSection title="Related Anime" subtitle="More from this story and universe" anime={anime.relatedAnime} loading={false} viewAllLink="/browse" />}
        {anime.recommendations.length > 0 && <AnimeSection title="You May Also Like" subtitle="Recommendations from AniList viewers" anime={anime.recommendations} loading={false} viewAllLink="/browse" />}
      </div>
    </div>
  );
}

function formatValue(value: string | null) {
  if (!value) return null;
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatListStatus(value: WatchlistStatus) {
  return ({ PLANNING: "Plan to Watch", WATCHING: "Watching", COMPLETED: "Completed", ON_HOLD: "On Hold", DROPPED: "Dropped" } satisfies Record<WatchlistStatus, string>)[value];
}
