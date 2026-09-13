import { LoaderCircle, Search, X } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  pending?: boolean;
};

export function SearchBar({ value, onChange, autoFocus = false, pending = false }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={21} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
        maxLength={100}
        placeholder="Search anime..."
        aria-label="Search anime"
        className="h-16 w-full rounded-lg border border-outline bg-surface pl-12 pr-12 text-base text-foreground shadow-card placeholder:text-zinc-500 transition focus:border-accent-secondary/60 focus:bg-surface-soft focus:outline-none"
      />
      {pending ? <LoaderCircle className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-accent-secondary" size={19} aria-label="Waiting to search" /> : value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Clear search">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
