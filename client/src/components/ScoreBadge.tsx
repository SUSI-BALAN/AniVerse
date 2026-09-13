import { Star } from "lucide-react";

export function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300" aria-label={`Score ${score} percent`}>
      <Star size={13} fill="currentColor" aria-hidden="true" />
      {score}%
    </span>
  );
}
