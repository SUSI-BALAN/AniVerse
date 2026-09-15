import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination } from "../types/anime";

export function PaginationControls({ pagination, onPageChange }: { pagination: Pagination | null; onPageChange: (page: number) => void }) {
  if (!pagination || (pagination.page === 1 && !pagination.hasNextPage)) return null;

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
      <button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="control-surface inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35">
        <ChevronLeft size={17} /> Previous
      </button>
      <span className="text-sm text-muted" aria-current="page">Page {pagination.page}</span>
      <button type="button" disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.page + 1)} className="control-surface inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35">
        Next <ChevronRight size={17} />
      </button>
    </nav>
  );
}
