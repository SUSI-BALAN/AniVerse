import type { Anime } from "../types/anime";
import { Clapperboard } from "lucide-react";
import { AnimeCard } from "./AnimeCard";
import { AnimeCardSkeleton } from "./AnimeCardSkeleton";
import { EmptyState } from "./EmptyState";

type AnimeGridProps = {
  anime: Anime[];
  loading?: boolean;
  emptyMessage?: string;
  ranked?: boolean;
};

export function AnimeGrid({ anime, loading = false, emptyMessage = "No anime found.", ranked = false }: AnimeGridProps) {
  if (loading) {
    return (
      <div className="anime-grid" aria-label="Loading anime">
        {Array.from({ length: 10 }, (_, index) => <AnimeCardSkeleton key={index} />)}
      </div>
    );
  }

  if (anime.length === 0) {
    return <EmptyState icon={Clapperboard} title="Nothing here yet" description={emptyMessage} />;
  }

  return <div className="anime-grid">{anime.map((item, index) => <AnimeCard key={item.id} anime={item} rank={ranked ? index + 1 : undefined} />)}</div>;
}
