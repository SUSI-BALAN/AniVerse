export function HeroSkeleton() {
  return (
    <div className="relative min-h-[31rem] overflow-hidden bg-surface sm:min-h-[38rem]" aria-label="Loading featured anime">
      <div className="absolute inset-0 animate-pulse bg-surface-soft" />
      <div className="relative mx-auto flex min-h-[31rem] max-w-page items-end px-4 pb-12 sm:min-h-[38rem] sm:px-6 lg:px-8 xl:px-10">
        <div className="w-full max-w-2xl animate-pulse"><div className="h-3 w-28 rounded bg-white/10" /><div className="mt-5 h-12 w-4/5 rounded bg-white/10" /><div className="mt-5 h-4 w-full rounded bg-white/5" /><div className="mt-3 h-4 w-3/4 rounded bg-white/5" /><div className="mt-7 h-11 w-64 rounded bg-white/10" /></div>
      </div>
    </div>
  );
}
