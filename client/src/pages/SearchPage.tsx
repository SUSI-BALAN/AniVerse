import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimeGrid } from "../components/AnimeGrid";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/PageState";
import { PaginationControls } from "../components/PaginationControls";
import { SearchBar } from "../components/SearchBar";
import { useAnimeSearch } from "../hooks/useAnimeSearch";
import { useDebounce } from "../hooks/useDebounce";
import { useLibrary } from "../context/LibraryContext";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebounce(trimmedQuery, 400);
  const results = useAnimeSearch(debouncedQuery, page);
  const { searchHistory, addSearch, removeSearch, clearSearches } = useLibrary();
  const savedQuery = useRef("");
  const pending = trimmedQuery !== debouncedQuery;

  useEffect(() => {
    if (debouncedQuery.length >= 2 && !results.loading && !results.error && savedQuery.current !== `${debouncedQuery}:${page}`) {
      savedQuery.current = `${debouncedQuery}:${page}`;
      if (page === 1) void addSearch(debouncedQuery);
    }
  }, [addSearch, debouncedQuery, page, results.error, results.loading]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <div className="page-shell min-h-[70vh]">
      <header className="mx-auto max-w-3xl pt-4 text-center sm:pt-8">
        <p className="text-xs font-black uppercase text-accent-secondary">AniVerse search</p>
        <h1 className="mt-3 text-3xl font-black text-foreground sm:text-5xl">Find your next anime.</h1>
        <p className="mt-3 text-muted">Search the AniList catalog by title.</p>
        <div className="mt-8 text-left"><SearchBar value={query} onChange={updateQuery} autoFocus pending={pending} /></div>
      </header>

      <section className="mt-12" aria-live="polite">
        {!debouncedQuery ? (
          searchHistory.length > 0 ? <div className="mx-auto max-w-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold uppercase text-muted">Recent searches</h2><button type="button" onClick={() => void clearSearches()} className="text-xs font-semibold text-muted hover:text-foreground">Clear searches</button></div><div className="flex flex-wrap gap-2">{searchHistory.map((item) => <div key={item.id} className="inline-flex items-center rounded-md border border-outline bg-surface px-3 py-2 text-sm text-foreground"><button type="button" onClick={() => updateQuery(item.query)} className="hover:text-accent-secondary">{item.query}</button><button type="button" onClick={() => void removeSearch(item.id)} aria-label={`Remove ${item.query} from recent searches`} className="ml-2 text-muted hover:text-foreground"><X size={14} /></button></div>)}</div></div> : <EmptyState icon={Search} title="Start with a title" description="Search for an anime by its English, Romaji, or native title." />
        ) : results.error ? (
          <ErrorState message="Unable to load search results." onRetry={results.retry} />
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-muted">Search results</p><h2 className="mt-1 text-2xl font-black text-foreground">Results for "{debouncedQuery}"</h2></div>{results.pagination && !results.loading && <span className="hidden text-sm text-muted sm:block">{results.pagination.total.toLocaleString()} titles</span>}</div>
            <AnimeGrid anime={results.anime} loading={results.loading || pending} emptyMessage={`No anime found for '${debouncedQuery}'. Try another title or spelling.`} />
            <PaginationControls pagination={results.pagination} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
