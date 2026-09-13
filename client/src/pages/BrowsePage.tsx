import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimeGrid } from "../components/AnimeGrid";
import { Button } from "../components/Button";
import { Drawer } from "../components/Drawer";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { PaginationControls } from "../components/PaginationControls";
import { ANIME_GENRES } from "../constants/anime";
import { useAnimePage } from "../hooks/useAnimePage";
import { browseAnime } from "../services/animeApi";
import type { AnimeSort, BrowseFilters } from "../types/anime";

const formats = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL"];
const statuses = [["RELEASING", "Releasing"], ["FINISHED", "Finished"], ["NOT_YET_RELEASED", "Upcoming"]] as const;
const sortOptions = [["POPULARITY", "Popularity"], ["TRENDING", "Trending"], ["SCORE", "Score"], ["NEWEST", "Newest"], ["OLDEST", "Oldest"], ["TITLE_ASC", "Title A–Z"], ["TITLE_DESC", "Title Z–A"]] as const;

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<BrowseFilters>(() => ({ genre: searchParams.get("genre") || undefined, format: searchParams.get("format") || undefined, status: searchParams.get("status") || undefined, season: (searchParams.get("season") as BrowseFilters["season"]) || undefined, year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined, minScore: searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined, sort: (searchParams.get("sort") as AnimeSort) || "POPULARITY" }));
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeFilters = useMemo(() => Object.entries(filters).filter(([key, value]) => key !== "sort" && value), [filters]);

  const updateFilter = (key: keyof BrowseFilters, value: string) => {
    const parsedValue = key === "year" && value ? Number(value) : value || undefined;
    const next = { ...filters, [key]: parsedValue };
    setFilters(next);
    setPage(1);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([name, item]) => { if (item !== undefined && item !== "") params.set(name, String(item)); });
    setSearchParams(params, { replace: true });
  };
  const clearFilters = () => { setFilters({ sort: "POPULARITY" }); setPage(1); setSearchParams({}, { replace: true }); };
  const fetcher = useCallback((signal: AbortSignal) => browseAnime(filters, page, 20, signal), [filters, page]);
  const result = useAnimePage(fetcher, [filters, page]);

  return (
    <div className="page-shell">
      <div className="flex items-start justify-between gap-4"><PageHeader title="Browse Anime" description="Shape the catalog around your mood, format, and era." /><Button variant="secondary" className="lg:hidden" onClick={() => setDrawerOpen(true)}><SlidersHorizontal size={17} /> Filters{activeFilters.length > 0 && ` (${activeFilters.length})`}</Button></div>
      <div className="mb-7 hidden border-y border-outline py-5 lg:block"><FilterPanel filters={filters} updateFilter={updateFilter} /></div>
      {activeFilters.length > 0 && <div className="mb-7 flex flex-wrap items-center gap-2" aria-label="Active filters">{activeFilters.map(([key, value]) => <button type="button" key={key} onClick={() => updateFilter(key as keyof BrowseFilters, "")} className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-foreground">{formatValue(String(value))}<X size={13} aria-hidden="true" /></button>)}<button type="button" onClick={clearFilters} className="px-2 py-1.5 text-xs font-semibold text-muted hover:text-foreground">Clear filters</button></div>}
      <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-muted">Catalog</p><h2 className="mt-1 text-2xl font-black text-foreground">{filters.genre ? `${filters.genre} anime` : "Discover anime"}</h2></div>{result.pagination && !result.loading && <span className="hidden text-sm text-muted sm:block">{result.pagination.total.toLocaleString()} titles</span>}</div>
      {result.error ? <ErrorState message={result.error} onRetry={result.retry} /> : <AnimeGrid anime={result.anime} loading={result.loading} />}
      <PaginationControls pagination={result.pagination} onPageChange={setPage} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Browse filters"><FilterPanel filters={filters} updateFilter={updateFilter} stacked /><Button className="mt-6 w-full" onClick={() => setDrawerOpen(false)}>Show results</Button></Drawer>
    </div>
  );
}

function FilterPanel({ filters, updateFilter, stacked = false }: { filters: BrowseFilters; updateFilter: (key: keyof BrowseFilters, value: string) => void; stacked?: boolean }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 67 }, (_, index) => currentYear + 1 - index);
  return <div className={`grid gap-4 ${stacked ? "grid-cols-1" : "grid-cols-4 xl:grid-cols-7"}`}><FilterSelect label="Genre" value={filters.genre ?? ""} onChange={(value) => updateFilter("genre", value)} options={ANIME_GENRES.map((value) => [value, value])} /><FilterSelect label="Format" value={filters.format ?? ""} onChange={(value) => updateFilter("format", value)} options={formats.map((value) => [value, value])} /><FilterSelect label="Status" value={filters.status ?? ""} onChange={(value) => updateFilter("status", value)} options={statuses} /><FilterSelect label="Season" value={filters.season ?? ""} onChange={(value) => updateFilter("season", value)} options={[["WINTER", "Winter"], ["SPRING", "Spring"], ["SUMMER", "Summer"], ["FALL", "Fall"]]} /><FilterSelect label="Year" value={filters.year ? String(filters.year) : ""} onChange={(value) => updateFilter("year", value)} options={years.map((value) => [String(value), String(value)])} /><FilterSelect label="Minimum score" value={filters.minScore ? String(filters.minScore) : ""} onChange={(value) => updateFilter("minScore", value)} options={[["60", "60+"], ["70", "70+"], ["80", "80+"], ["90", "90+"]]} /><FilterSelect label="Sort" value={filters.sort ?? "POPULARITY"} onChange={(value) => updateFilter("sort", value as AnimeSort)} includeAny={false} options={sortOptions} /></div>;
}

function FilterSelect({ label, value, onChange, options, includeAny = true }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; includeAny?: boolean }) {
  return <label><span className="mb-2 block text-xs font-bold uppercase text-muted">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="control-surface h-11 w-full rounded-md px-3 text-sm focus:border-accent-secondary focus:outline-none">{includeAny && <option value="">Any {label.toLowerCase()}</option>}{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function formatValue(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
