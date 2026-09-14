import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const formats = ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"] as const;
const statuses = [["RELEASING", "Releasing"], ["FINISHED", "Finished"], ["NOT_YET_RELEASED", "Upcoming"], ["CANCELLED", "Cancelled"], ["HIATUS", "Hiatus"]] as const;
const seasons = [["WINTER", "Winter"], ["SPRING", "Spring"], ["SUMMER", "Summer"], ["FALL", "Fall"]] as const;
const sorts = [["POPULARITY", "Popularity"], ["TRENDING", "Trending"], ["SCORE", "Score"], ["NEWEST", "Newest"], ["OLDEST", "Oldest"], ["TITLE_ASC", "Title A–Z"], ["TITLE_DESC", "Title Z–A"]] as const;
const validSort = (v: string | null): v is AnimeSort => sorts.some(([x]) => x === v);
function validRange(f: BrowseFilters) { return (f.yearFrom === undefined || (Number.isInteger(f.yearFrom) && f.yearFrom >= 1940 && f.yearFrom <= 2100)) && (f.yearTo === undefined || (Number.isInteger(f.yearTo) && f.yearTo >= 1940 && f.yearTo <= 2100)) && !(f.yearFrom && f.yearTo && f.yearFrom > f.yearTo); }
const validYear = (v: string | null) => { const n = Number(v); return Number.isInteger(n) && n >= 1940 && n <= 2100 ? n : undefined; };

export function parseBrowseParams(p: URLSearchParams) {
  const csv = (key: string) => p.get(key)?.split(",").map((v) => v.trim()).filter(Boolean);
  const score = Number(p.get("minScore"));
  const filters: BrowseFilters = {
    genre: p.get("genre") || undefined, genres: csv("genres"), format: p.get("format") || undefined, formats: csv("formats"), status: p.get("status") || undefined, statuses: csv("statuses"),
    season: seasons.some(([v]) => v === p.get("season")) ? p.get("season") as BrowseFilters["season"] : undefined,
    year: validYear(p.get("year")), yearFrom: validYear(p.get("yearFrom")), yearTo: validYear(p.get("yearTo")),
    minScore: p.has("minScore") && Number.isInteger(score) && score >= 0 && score <= 100 ? score : undefined, sort: validSort(p.get("sort")) ? p.get("sort") as AnimeSort : "POPULARITY"
  };
  if (filters.yearFrom && filters.yearTo && filters.yearFrom > filters.yearTo) filters.yearTo = undefined;
  if (filters.genre && !ANIME_GENRES.some(v => v === filters.genre)) filters.genre = undefined;
  filters.genres = filters.genres ? [...new Set(filters.genres.filter(v => ANIME_GENRES.some(x => x === v)))].sort() : undefined;
  if (filters.genres?.length) filters.genre = undefined;
  if (filters.format && !formats.some(v => v === filters.format)) filters.format = undefined;
  filters.formats = filters.formats?.filter(v => formats.some(x => x === v));
  if (filters.status && !statuses.some(([v]) => v === filters.status)) filters.status = undefined;
  filters.statuses = filters.statuses?.filter(v => statuses.some(([x]) => x === v));
  const page = Math.max(1, Number(p.get("page")) || 1);
  return { filters, page: Number.isInteger(page) ? page : 1 };
}
export function browseParams(f: BrowseFilters, page = 1) {
  const p = new URLSearchParams();
  const values: Record<string, string | number | undefined> = { genre: f.genre, format: f.format, status: f.status, season: f.season, year: f.year, yearFrom: f.yearFrom, yearTo: f.yearTo, minScore: f.minScore, sort: f.sort === "POPULARITY" ? undefined : f.sort, page: page > 1 ? page : undefined };
  Object.entries(values).forEach(([k, v]) => v !== undefined && p.set(k, String(v)));
  if (f.genres?.length) p.set("genres", [...f.genres].sort().join(","));
  if (f.formats?.length) p.set("formats", [...f.formats].sort().join(","));
  if (f.statuses?.length) p.set("statuses", [...f.statuses].sort().join(","));
  return p;
}

export function BrowsePage() {
  const [url, setUrl] = useSearchParams();
  const { filters, page } = useMemo(() => parseBrowseParams(url), [url]);
  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState(filters);
  useEffect(() => { setDraft(filters); const normalized = browseParams(filters, page); if (normalized.toString() !== url.toString()) setUrl(normalized, {replace:true}); }, [filters, page, url, setUrl]);
  const commit = useCallback((next: BrowseFilters, nextPage = 1) => { if (!validRange(next)) return; setUrl(browseParams(next, nextPage)); }, [setUrl]);
  const change = (current: BrowseFilters, key: keyof BrowseFilters, value: string): BrowseFilters => ({ ...current, ...(key === "genres" ? { genre: undefined } : {}), [key]: key === "genres" ? value.split(",").filter(Boolean) : ["year", "yearFrom", "yearTo", "minScore"].includes(key) ? value ? Number(value) : undefined : value || undefined });
  const fetcher = useCallback((signal: AbortSignal) => browseAnime(filters, page, 20, signal), [filters, page]);
  const result = useAnimePage(fetcher, [filters, page]);
  const active = Object.entries(filters).filter(([k, v]) => k !== "sort" && v && (!Array.isArray(v) || v.length)).flatMap(([key,value]) => Array.isArray(value) ? value.map(v => ({key, value:v})) : [{key,value:String(value)}]);
  const remove = (key: keyof BrowseFilters, value: string) => { const current = filters[key]; commit({ ...filters, [key]: Array.isArray(current) ? current.filter(v => v !== value) : undefined }); };
  return <div className="page-shell"><div className="flex items-start justify-between gap-4"><PageHeader title="Browse Anime" description="Shape the catalog around your mood, format, and era."/><Button variant="secondary" className="lg:hidden" onClick={() => setDrawer(true)}><SlidersHorizontal size={17}/> Filters{active.length ? ` (${active.length})` : ""}</Button></div><div className="mb-7 hidden border-y border-outline py-5 lg:block"><FilterPanel filters={filters} onChange={(k,v) => commit(change(filters, k, v))}/></div>{active.length > 0 && <div className="mb-7 flex flex-wrap items-center gap-2" aria-label="Active filters">{active.map(({key:k,value:v}) => <button type="button" aria-label={`Remove ${v} ${k} filter`} key={`${k}:${v}`} onClick={() => remove(k as keyof BrowseFilters, v)} className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-foreground">{String(v)}<X size={13} aria-hidden="true"/></button>)}<button type="button" onClick={() => commit({ sort: "POPULARITY" })} className="px-2 py-1.5 text-xs font-semibold text-muted">Clear filters</button></div>}<div className="mb-6"><p className="text-xs font-bold uppercase text-muted">Catalog</p><h2 className="mt-1 text-2xl font-black text-foreground">{filters.genre ? `${filters.genre} anime` : "Discover anime"}</h2></div>{result.error ? <ErrorState message={result.error} onRetry={result.retry}/> : <AnimeGrid anime={result.anime} loading={result.loading}/>}<PaginationControls pagination={result.pagination} onPageChange={(next) => commit(filters, next)}/><Drawer open={drawer} onClose={() => setDrawer(false)} title="Browse filters"><FilterPanel filters={draft} onChange={(k,v) => setDraft((d) => change(d, k, v))} stacked/>{!validRange(draft) && <p role="alert" className="mt-3 text-sm text-red-400">Year from must be no later than year to.</p>}{draft.genres?.map(genre => <button type="button" key={genre} aria-label={`Remove draft ${genre}`} onClick={() => setDraft(d => ({...d, genres:d.genres?.filter(g => g !== genre)}))} className="mt-3 rounded border px-2 py-1">{genre}</button>)}<button type="button" className="mt-4 text-sm text-muted" onClick={() => setDraft({ sort: "POPULARITY" })}>Clear filters</button><Button className="mt-6 w-full" disabled={!validRange(draft)} onClick={() => { commit(draft); setDrawer(false); }}>Show results</Button></Drawer></div>;
}

function FilterPanel({ filters, onChange, stacked = false }: { filters: BrowseFilters; onChange: (key: keyof BrowseFilters, value: string) => void; stacked?: boolean }) {
  const years = Array.from({ length: 87 }, (_, i) => new Date().getFullYear() + 1 - i);
  return <div className={`grid gap-4 ${stacked ? "grid-cols-1" : "grid-cols-4 xl:grid-cols-7"}`}><MultiSelect label="Genres (select multiple)" value={(Array.isArray(filters.genres) ? filters.genres.join(",") : filters.genres ?? filters.genre ?? "")} onChange={(v) => onChange("genres", v)} options={ANIME_GENRES.map((v) => [v,v])}/><FilterSelect label="Format" value={filters.format ?? ""} onChange={(v) => onChange("format",v)} options={formats.map((v) => [v,v])}/><FilterSelect label="Status" value={filters.status ?? ""} onChange={(v) => onChange("status",v)} options={statuses}/><FilterSelect label="Season" value={filters.season ?? ""} onChange={(v) => onChange("season",v)} options={seasons}/><FilterSelect label="Year" value={filters.year ? String(filters.year) : ""} onChange={(v) => onChange("year",v)} options={years.map((v) => [String(v),String(v)])}/><div className="grid grid-cols-2 gap-2"><label><span className="mb-2 block text-xs font-bold uppercase text-muted">Year from</span><input aria-label="Year from" type="number" min="1940" max="2100" value={filters.yearFrom ?? ""} onChange={(e) => onChange("yearFrom", e.target.value)} className="control-surface h-11 w-full rounded-md px-3"/></label><label><span className="mb-2 block text-xs font-bold uppercase text-muted">Year to</span><input aria-label="Year to" type="number" min="1940" max="2100" value={filters.yearTo ?? ""} onChange={(e) => onChange("yearTo", e.target.value)} className="control-surface h-11 w-full rounded-md px-3"/></label></div><FilterSelect label="Minimum score" value={filters.minScore ? String(filters.minScore) : ""} onChange={(v) => onChange("minScore",v)} options={[["60","60+"],["70","70+"],["80","80+"],["90","90+"]]}/><FilterSelect label="Sort" value={filters.sort ?? "POPULARITY"} onChange={(v) => onChange("sort",v)} includeAny={false} options={sorts}/></div>;
}
function MultiSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string) => void; options: readonly (readonly [string,string])[] }) { return <label><span className="mb-2 block text-xs font-bold uppercase text-muted">{label}</span><select aria-label="Genres (select multiple)" multiple value={value ? value.split(",") : []} onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value).join(","))} className="control-surface min-h-11 w-full rounded-md px-3 text-sm">{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
function FilterSelect({ label, value, onChange, options, includeAny = true }: { label: string; value: string; onChange: (v:string) => void; options: readonly (readonly [string,string])[]; includeAny?: boolean }) { return <label><span className="mb-2 block text-xs font-bold uppercase text-muted">{label}</span><select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="control-surface h-11 w-full rounded-md px-3 text-sm">{includeAny && <option value="">Any {label.toLowerCase()}</option>}{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
