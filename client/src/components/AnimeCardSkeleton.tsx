export function AnimeCardSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="aspect-[2/3] rounded-md border border-outline bg-surface-soft" />
      <div className="mt-3 h-4 w-5/6 rounded bg-white/10" />
      <div className="mt-2 flex gap-2"><div className="h-3 w-12 rounded bg-white/5" /><div className="h-3 w-16 rounded bg-white/5" /></div>
    </div>
  );
}
