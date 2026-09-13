export const WATCHLIST_STATUSES = ["PLANNING", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"] as const;
export type WatchlistStatus = (typeof WATCHLIST_STATUSES)[number];

export type AnimeSnapshotInput = {
  anilistId: number;
  malId?: number | null;
  title: string;
  titleRomaji?: string | null;
  coverImage?: string | null;
  bannerImage?: string | null;
  format?: string | null;
  seasonYear?: number | null;
  averageScore?: number | null;
  genres?: string[];
};

export type Favorite = AnimeSnapshotInput & { id: number; addedAt: string };
export type WatchlistItem = AnimeSnapshotInput & { id: number; status: WatchlistStatus; notes: string | null; addedAt: string; updatedAt: string };
export type RecentlyViewed = AnimeSnapshotInput & { id: number; lastViewedAt: string; viewCount: number };
export type SearchHistoryItem = { id: number; query: string; searchedAt: string };
