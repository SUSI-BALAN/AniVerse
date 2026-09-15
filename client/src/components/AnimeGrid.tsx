import type { Anime } from "../types/anime";
import { Clapperboard } from "lucide-react";
import { AnimeCard } from "./AnimeCard";
import { AnimeCardSkeleton } from "./AnimeCardSkeleton";
import { EmptyState } from "./EmptyState";

type AnimeGridProps = {
  anime: Anime[];
  loading?: boolean;
  announceLoading?: boolean;
  emptyMessage?: string;
  ranked?: boolean;
};

export function AnimeGrid({ anime, loading = false, announceLoading = true, emptyMessage = "No anime found.", ranked = false }: AnimeGridProps) {
  if (loading) {
    return (
      <div role={announceLoading ? "status" : undefined} aria-label={announceLoading ? "Loading anime" : undefined}><div className="anime-grid" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <AnimeCardSkeleton key={index} />)}
      </div></div>
    );
  }

  if (anime.length === 0) {
    return <EmptyState icon={Clapperboard} title="Nothing here yet" description={emptyMessage} />;
  }

  return <section aria-label="Anime results"><h2 className="sr-only">Anime results</h2><div className="anime-grid">{anime.map((item, index) => <AnimeCard key={item.id} anime={item} rank={ranked ? index + 1 : undefined} />)}</div></section>;
}
