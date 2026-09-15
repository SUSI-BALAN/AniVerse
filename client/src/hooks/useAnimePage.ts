import { useEffect, useState } from "react";
import type { Anime, Pagination } from "../types/anime";
import { errorMessageWithReference } from '../services/observability';

type PageFetcher = (signal: AbortSignal) => Promise<{ data: Anime[]; pagination: Pagination }>;

export function useAnimePage(fetcher: PageFetcher, dependencies: readonly unknown[]) {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
      return fetcher(controller.signal);
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setAnime(response.data);
        setPagination(response.pagination);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? errorMessageWithReference(reason) : "We couldn't load anime information right now.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // Callers provide primitive dependencies that define the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, retryKey]);

  return { anime, pagination, loading, error, retry: () => setRetryKey((key) => key + 1) };
}
