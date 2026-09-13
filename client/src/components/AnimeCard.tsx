import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Anime } from "../types/anime";
import { getAnimeTitle } from "../utils/animeTitle";
import { AnimeImage } from "./AnimeImage";
import { ScoreBadge } from "./ScoreBadge";
import { useOptionalLibrary } from "../context/LibraryContext";

export function AnimeCard({ anime, rank, label }: { anime: Anime; rank?: number; label?: string | null }) {
  const library = useOptionalLibrary();
  const preference = library?.settings.title_preference as "english" | "romaji" | "native" | undefined;
  const title = getAnimeTitle(anime, preference || "english");
  const image = anime.coverImage.extraLarge || anime.coverImage.large;
  const reduceMotion = useReducedMotion();

  return (
    <motion.article initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="min-w-0">
      <Link to={`/anime/${anime.id}`} className="group block" aria-label={`View details for ${title}`}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-soft shadow-card ring-1 ring-outline transition duration-200 group-hover:ring-white/25 group-focus-visible:ring-accent-secondary">
          <AnimeImage src={image} alt={`${title} cover`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035] group-focus-visible:scale-[1.035]" />
          {rank && <span className="absolute left-2 top-2 min-w-10 rounded-sm bg-black/75 px-2 py-1 text-center text-xs font-black text-white backdrop-blur-sm">#{String(rank).padStart(2, "0")}</span>}
          {label && <span className="absolute right-2 top-2 max-w-[75%] truncate rounded-sm bg-black/75 px-2 py-1 text-[10px] font-bold uppercase text-zinc-200 backdrop-blur-sm">{label.replaceAll("_", " ")}</span>}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent opacity-55 transition group-hover:opacity-90 group-focus-visible:opacity-90" />
          <div className="absolute inset-x-0 bottom-0 translate-y-1 p-3 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
              View details <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="pt-3">
          <h3 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 text-foreground transition group-hover:text-accent-secondary">{title}</h3>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
            <ScoreBadge score={anime.averageScore} />
            {anime.format && <span className="truncate">{anime.format.replaceAll("_", " ")}</span>}
            {anime.seasonYear && <span>{anime.seasonYear}</span>}
          </div>
          {anime.episodes && <p className="mt-1 text-xs text-zinc-500">{anime.episodes} episodes</p>}
        </div>
      </Link>
    </motion.article>
  );
}
