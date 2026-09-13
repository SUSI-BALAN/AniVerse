CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL UNIQUE,
  mal_id INTEGER,
  title TEXT NOT NULL,
  title_romaji TEXT,
  cover_image TEXT,
  banner_image TEXT,
  format TEXT,
  season_year INTEGER,
  average_score INTEGER,
  genres TEXT,
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL UNIQUE,
  mal_id INTEGER,
  title TEXT NOT NULL,
  title_romaji TEXT,
  cover_image TEXT,
  banner_image TEXT,
  format TEXT,
  season_year INTEGER,
  average_score INTEGER,
  genres TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNING',
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL,
  mal_id INTEGER,
  title TEXT NOT NULL,
  cover_image TEXT,
  episode_number INTEGER NOT NULL,
  total_episodes INTEGER,
  progress_percentage REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  genres TEXT,
  provider_id TEXT,
  language TEXT,
  watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episode_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  total_episodes INTEGER,
  current_time REAL NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  genres TEXT,
  mal_id INTEGER,
  title TEXT,
  cover_image TEXT,
  provider_id TEXT,
  language TEXT,
  first_watched_at TEXT,
  last_watched_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (anilist_id, episode_number)
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  searched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recently_viewed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL UNIQUE,
  mal_id INTEGER,
  title TEXT NOT NULL,
  title_romaji TEXT,
  cover_image TEXT,
  banner_image TEXT,
  format TEXT,
  season_year INTEGER,
  average_score INTEGER,
  genres TEXT,
  last_viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  view_count INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS provider_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anime_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  anilist_id INTEGER,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history (watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_progress_anilist_id ON episode_progress (anilist_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history (searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_last_viewed_at ON recently_viewed (last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_anime_cache_anilist_id ON anime_cache (anilist_id);
CREATE INDEX IF NOT EXISTS idx_anime_cache_expires_at ON anime_cache (expires_at);
