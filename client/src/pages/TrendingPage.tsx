import { useCallback, useState } from "react";
import { AnimeGrid } from "../components/AnimeGrid";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { PaginationControls } from "../components/PaginationControls";
import { useAnimePage } from "../hooks/useAnimePage";
import { getTrendingAnime } from "../services/animeApi";

export function TrendingPage() {
  const [page, setPage] = useState(1);
  const fetcher = useCallback((signal: AbortSignal) => getTrendingAnime(page, 20, signal), [page]);
  const result = useAnimePage(fetcher, [page]);

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Live pulse" title="Trending Now" description="The anime generating the most attention across AniList right now." />
      {result.error ? <ErrorState message={result.error} onRetry={result.retry} /> : <AnimeGrid anime={result.anime} loading={result.loading} ranked />}
      <PaginationControls pagination={result.pagination} onPageChange={setPage} />
    </div>
  );
}
