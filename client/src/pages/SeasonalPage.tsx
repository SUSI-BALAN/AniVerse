import { useCallback, useState } from "react";
import { AnimeGrid } from "../components/AnimeGrid";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { PaginationControls } from "../components/PaginationControls";
import { ANIME_SEASONS, getCurrentAnimeSeason } from "../constants/anime";
import { useAnimePage } from "../hooks/useAnimePage";
import { getSeasonalAnime } from "../services/animeApi";
import type { AnimeSeason } from "../types/anime";

export function SeasonalPage() {
  const current = getCurrentAnimeSeason();
  const [season, setSeason] = useState<AnimeSeason>(current.season);
  const [year, setYear] = useState(current.year);
  const [page, setPage] = useState(1);
  const years = Array.from({ length: 12 }, (_, index) => current.year + 1 - index);
  const fetcher = useCallback((signal: AbortSignal) => getSeasonalAnime(season, year, page, 20, signal), [page, season, year]);
  const result = useAnimePage(fetcher, [season, year, page]);

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Release calendar" title="Seasonal Anime" description="Explore current releases or step back through recent anime seasons." />
      <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">{season.charAt(0) + season.slice(1).toLowerCase()} {year}</h2></div>
      <div className="mb-8 flex flex-col gap-4 border-y border-outline py-5 sm:flex-row sm:items-end">
        <fieldset className="flex-1">
          <legend className="mb-2 text-xs font-bold uppercase text-muted">Season</legend>
          <div className="flex flex-wrap gap-2">
            {ANIME_SEASONS.map((value) => <button key={value} type="button" aria-pressed={season === value} onClick={() => { setSeason(value); setPage(1); }} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${season === value ? "bg-foreground text-background" : "bg-surface-soft text-muted hover:text-foreground"}`}>{value.charAt(0) + value.slice(1).toLowerCase()}</button>)}
          </div>
        </fieldset>
        <label className="w-full sm:w-36">
          <span className="mb-2 block text-xs font-bold uppercase text-muted">Year</span>
          <select value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }} className="control-surface h-10 w-full rounded-md px-3 text-sm focus:border-accent-secondary focus:outline-none">
            {years.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {result.error ? <ErrorState message={result.error} onRetry={result.retry} /> : <AnimeGrid anime={result.anime} loading={result.loading} />}
      <PaginationControls pagination={result.pagination} onPageChange={setPage} />
    </div>
  );
}
