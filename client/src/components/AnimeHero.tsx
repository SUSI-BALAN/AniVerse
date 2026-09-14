import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, Play, Pause, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { Anime } from "../types/anime";
import { getAnimeTitle } from "../utils/animeTitle";
import { AnimeImage } from "./AnimeImage";
import { Button } from "./Button";
import { GenreBadge } from "./GenreBadge";
import { HeroSkeleton } from "./HeroSkeleton";
import { useOptionalLibrary } from '../context/LibraryContext';

export function AnimeHero({ anime, loading, spotlightLabel = 'Trending spotlight' }: { anime: Anime[]; loading: boolean; spotlightLabel?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const library = useOptionalLibrary();
  const reduceMotion = systemReducedMotion || library?.settings.reduced_motion === 'true';
  const items = anime.filter((item) => item.bannerImage).slice(0, 5);
  const current = items[index] ?? anime[0];

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  useEffect(() => {
    if (reduceMotion || paused || focusPaused || userPaused || items.length < 2) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearInterval(timer);
      if (!document.hidden) timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), 7000);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [items.length, paused, focusPaused, userPaused, reduceMotion]);

  if (loading && !current) return <HeroSkeleton />;

  if (!current) {
    return (
      <section className="relative flex min-h-[31rem] items-end overflow-hidden border-b border-outline bg-surface">
        <div className="mx-auto w-full max-w-page px-4 pb-14 sm:px-6 lg:px-8 xl:px-10"><p className="text-sm font-bold uppercase text-accent-secondary">AniVerse</p><h1 className="mt-3 max-w-2xl text-4xl font-black text-foreground sm:text-6xl">Stories worth discovering.</h1><p className="mt-5 max-w-xl text-muted">Featured anime will return when metadata is available.</p></div>
      </section>
    );
  }

  const title = getAnimeTitle(current);
  const changeSlide = (direction: number) => setIndex((value) => (value + direction + items.length) % items.length);

  return (
    <section className="relative min-h-[31rem] overflow-hidden border-b border-outline bg-surface sm:min-h-[38rem] lg:min-h-[42rem]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setFocusPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusPaused(false); }} aria-roledescription="carousel" aria-label="Featured anime">
      <AnimatePresence mode="wait">
        <motion.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.55 }} className="absolute inset-0">
          {current.bannerImage ? <AnimeImage src={current.bannerImage} alt="" eager className="h-full w-full object-cover object-center" /> : <div className="h-full w-full bg-surface-soft" />}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/25" />
        </motion.div>
      </AnimatePresence>
      <div className="relative mx-auto flex min-h-[31rem] max-w-page items-end px-4 pb-12 pt-24 sm:min-h-[38rem] sm:px-6 sm:pb-16 lg:min-h-[42rem] lg:px-8 xl:px-10">
        <motion.div key={`copy-${current.id}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.12 }} className="max-w-2xl">
          <p className="text-xs font-black uppercase text-accent-secondary">{spotlightLabel}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-foreground sm:text-6xl lg:text-7xl">{title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
            {current.averageScore && <span className="inline-flex items-center gap-1 font-bold text-amber-300"><Star size={16} fill="currentColor" /> {current.averageScore}%</span>}
            {current.format && <span>{current.format.replaceAll("_", " ")}</span>}
            {current.seasonYear && <span>{current.seasonYear}</span>}
            {current.episodes && <span>{current.episodes} episodes</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{current.genres.slice(0, 3).map((genre) => <GenreBadge key={genre}>{genre}</GenreBadge>)}</div>
          <p className="mt-5 line-clamp-3 max-w-xl text-sm leading-6 text-zinc-200 sm:text-base sm:leading-7">{current.description ?? "Explore one of AniList's most talked-about titles."}</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button disabled title="Playback is not available yet"><Play size={17} fill="currentColor" /> Watch now</Button><Button to={`/anime/${current.id}`} variant="secondary"><Info size={17} /> More info</Button></div>
        </motion.div>
      </div>
      {items.length > 1 && (
        <div className="absolute right-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap justify-end gap-2 sm:bottom-7 sm:right-7 sm:top-auto">
          <button type="button" disabled={Boolean(reduceMotion)} onClick={() => setUserPaused(v => !v)} aria-pressed={userPaused || Boolean(reduceMotion)} className="inline-flex min-h-9 items-center gap-1 rounded-md bg-black/55 px-2 text-xs font-semibold text-white backdrop-blur-md">{userPaused || reduceMotion ? <Play size={14} /> : <Pause size={14} />}{reduceMotion ? 'Rotation paused' : userPaused ? 'Play rotation' : 'Pause rotation'}</button>
          <div className="mr-1 flex gap-1.5" aria-label="Featured anime slides">{items.map((item, itemIndex) => <button type="button" key={item.id} onClick={() => setIndex(itemIndex)} aria-label={`Show ${getAnimeTitle(item)}`} aria-current={itemIndex === index ? "true" : undefined} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-6 bg-foreground" : "w-1.5 bg-white/45 hover:bg-white"}`} />)}</div>
          <button type="button" onClick={() => changeSlide(-1)} className="flex h-9 w-9 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-md hover:bg-black/80" aria-label="Previous featured anime"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => changeSlide(1)} className="flex h-9 w-9 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-md hover:bg-black/80" aria-label="Next featured anime"><ChevronRight size={18} /></button>
        </div>
      )}
    </section>
  );
}
