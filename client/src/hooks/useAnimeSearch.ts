import { useCallback } from "react";
import { searchAnime } from "../services/animeApi";
import { useAnimePage } from "./useAnimePage";

export function useAnimeSearch(query: string, page = 1) {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      query ? searchAnime(query, page, 20, signal) : Promise.resolve({ data: [], pagination: { page, perPage: 20, hasNextPage: false, total: 0 } }),
    [page, query]
  );
  return useAnimePage(fetcher, [query, page]);
}
