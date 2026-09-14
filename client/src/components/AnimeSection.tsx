import { ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import type { Anime, RelatedAnime } from "../types/anime";
import { AnimeCard } from "./AnimeCard";
import { AnimeCardSkeleton } from "./AnimeCardSkeleton";
import { ErrorState } from "./PageState";
import { EmptyState } from "./EmptyState";

type AnimeSectionProps = {
  title: string;
  subtitle?: string;
  anime: Array<Anime | RelatedAnime>;
  loading: boolean;
  viewAllLink?: string;
  error?: string | null;
  onRetry?: () => void;
  reasons?: Record<number, string>;
};

export function AnimeSection({ title, subtitle, anime, loading, viewAllLink, error, onRetry, reasons }: AnimeSectionProps) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.75, behavior: "smooth" });

  return (
    <section className="py-8" aria-labelledby={`section-${title.replaceAll(" ", "-").toLowerCase()}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><h2 id={`section-${title.replaceAll(" ", "-").toLowerCase()}`} className="text-xl font-black text-foreground sm:text-2xl">{title}</h2>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => scroll(-1)} className="hidden h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-white/8 hover:text-foreground md:flex" aria-label={`Scroll ${title} left`}><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => scroll(1)} className="hidden h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-white/8 hover:text-foreground md:flex" aria-label={`Scroll ${title} right`}><ChevronRight size={18} /></button>
          {viewAllLink && <Link to={viewAllLink} className="ml-2 text-sm font-semibold text-accent-secondary hover:text-foreground">View all</Link>}
        </div>
      </div>
      {error ? <ErrorState message="This collection is unavailable right now." onRetry={onRetry} compact /> : !loading && anime.length === 0 ? <EmptyState icon={Clapperboard} title="No titles available" description="This collection does not have any anime to show right now." /> : (
        <div ref={rail} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:px-0" tabIndex={0} aria-label={`${title} anime`}>
          {loading
            ? Array.from({ length: 7 }, (_, index) => <div key={index} className="w-[42vw] shrink-0 snap-start sm:w-44 lg:w-48"><AnimeCardSkeleton /></div>)
            : anime.map((item) => <div key={item.id} className="w-[42vw] shrink-0 snap-start sm:w-44 lg:w-48"><AnimeCard anime={item} label={"relationType" in item ? item.relationType : null} />{reasons?.[item.id] && <p className="mt-2 break-words text-xs leading-relaxed text-muted">{reasons[item.id]}</p>}</div>)}
        </div>
      )}
    </section>
  );
}
