type GenreBadgeProps = { children: string };

export function GenreBadge({ children }: GenreBadgeProps) {
  return <span className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-xs font-medium text-zinc-200">{children}</span>;
}
