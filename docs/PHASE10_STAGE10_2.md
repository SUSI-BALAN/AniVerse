# Phase 10.2 — Library UX upgrade

Implementation is local only. No commit, push or deployment is authorized by this stage.

## Audit and compatibility

Before this stage, LibraryContext fetched five legacy collections at startup: Favorites,
Watchlist, recently viewed, search history and settings. History also fetched playback
history. Favorites and Watchlist returned complete arrays; recently viewed retained at
most 250 items, playback history defaulted to 100 (maximum 250), and continue/completed
feeds defaulted to 20 (maximum 50). Favorites sorted by added date and row ID descending;
Watchlist sorted by update date and row ID descending. Whole-array optimistic rollback
could erase successful concurrent changes. No bulk mutation contract existed.

Existing `/api/favorites`, `/api/watchlist`, `/api/history`, `/api/watch-history` and
progress feed response shapes and operations remain unchanged. The additive
`GET /api/library/:collection` supports Favorites, Watchlist, recently viewed,
playback history, continue watching and recently completed. It returns
`items`, `page`, `pageSize`, `total`, `totalPages`, and available stored `genres`.

Queries accept search (100 characters), genre (40), relevant Watchlist status,
date/title/score/year sort, asc/desc direction, page (1–100000), and page size
12/24/48. Unknown fields and irrelevant status/score/year options are rejected.
Search uses stored title/romaji values; it performs no AniList enrichment requests.
LIKE wildcard input is escaped. SQL identifiers come from closed maps and all values
are bound. Genre facets are bounded to 100 stored labels. Null scores/years sort last. Anime ID and episode/row ID break ties.
PostgreSQL 17 Unicode collation handles normalization, with binary title ordering;
SQLite uses a deterministic lowercase function. Accent/Tamil fixtures verify parity.
Dates normalize to UTC ISO strings and unavailable metadata remains null.

The shared query repository owns SQL and query semantics. SQLite reads use a transaction;
PostgreSQL pages/counts/genre facets use repeatable-read read-only transactions.
Ownership comes from verified request identity. The existing RLS policies, no-store,
bearer validation, rate limits, TLS, CORS and CSP are retained.

## UI and refresh behavior

All library pages reuse LibraryBrowser, AnimeGrid/cards, AnimeImage, ProgressBar,
Drawer, ConfirmDialog, EmptyState and ErrorState. List rows show stored metadata;
Watchlist rows also offer existing status changes. History separates playback,
recently viewed, continue watching and recently completed. Resume times and episode
progress use real saved values. Completed playback offers Watch again.

Search is debounced by 300 ms. Genre/status/sort are applied together, including in
the mobile filter drawer. Query state is in the URL and works with navigation.
Grid/list and page size persist through existing validated `app_settings` keys
`library_view_mode` and `library_page_size`, in both local and cloud modes.
The existing version-1 backup settings map naturally exports/imports them.

Initial loads use skeletons; later requests keep current rows visible. Aborted or
outdated responses cannot replace newer results. Counts are announced and controls
have accessible names, selected states, focus styles and keyboard behavior.

Startup reads compact membership IDs/statuses, search history and settings. It does
not download full Favorites/Watchlist/history snapshots. Membership is intentionally
complete so detail/card actions remain accurate; this compact payload is still O(N).
Full snapshot arrays in LibraryContext are optional caches for explicit refresh and
mutations, not authoritative complete collection lists. Settings counts use membership.
Paged views track collection-specific revisions. Mutations update compact membership
without refetching unrelated collections. Explicit full refresh remains for reset/import.
Rollback changes only the affected item; duplicate writes to a pending record are
prevented. Preference writes are ordered per key to avoid response races.

## Performance evidence

`node --import tsx scripts/benchmark-library.mjs` uses in-memory SQLite fixtures
(1000 Favorites, 1000 Watchlist, 250 recently viewed). Optional PostgreSQL benchmarking
is restricted to loopback Stage 10.2 test databases. Fixture owners are cleaned up.
These are local API measurements, not production or React-render performance claims.

| Page | Previous source-derived request graph | Current graph | Previous bytes | Current bytes |
| --- | --- | --- | --- | --- |
| Favorites | 5 reads | 4 reads | 588642 | 47630 |
| Watchlist | 5 reads | 4 reads | 588642 | 48110 |
| History | 6 reads | 4 reads | 588668 | 42246 |

The Favorites collection response alone fell from 229704 bytes to 5480 bytes at
24 items. The browser scenario independently checks one initial paged request and
absence of full legacy collection requests, and attaches local render-ready timing.

The isolated PostgreSQL plan for 5000 owned Favorites chose Limit/Sort/Seq Scan and
ran in 2.068 ms. A sequential scan is reasonable for this single-owner fixture;
existing owner/date indexes remain available. This evidence does not justify a new
index migration. Existing migrations 001 and 002 are untouched; there is no 003.

## Deferred scope and limitations

Bulk actions are deferred: introducing a transactional bulk mutation API would expand
the stage. Remove-from-continue is deferred because current removal deletes episode
progress; hiding an item must not silently erase progress. Genre facets scan owned
stored metadata, and compact membership still scales with collection size. Deep offset
paging may need later measured optimization. Existing recently viewed retention and
progress completion semantics are preserved. No provider is enabled, and no discovery,
recommendation, home, PWA or broad context refactor is included.

## Verification

Focused SQLite/API tests cover search, genres/statuses, stable ordering, empty pages,
bounds, unknown fields, legacy shapes, private cache headers, non-destructive startup,
backup symmetry and collection resets. Real PostgreSQL tests cover all six collection
adapters, nullability/timestamps, A/B ownership, direct RLS, backups and reset isolation.
RTL tests cover shared controls, debouncing, paging, list metadata, preferences, empty
results, retry, keyboard/mobile filters, focused reads and concurrent rollback.
Browser tests use local fixtures and mocked cloud auth with isolated PostgreSQL, never
production credentials. Profile, logout, security, statistics and recommendations are
included in the existing regression suites. Final command results are reported in the
Stage 10.2 completion report.

Final verification (2026-09-14): typecheck PASS; client 70 passed; server 154 passed,
0 skipped, 0 failed with isolated PostgreSQL enabled; Stage 10.2 PostgreSQL integration
10 passed; local Playwright 10/10; isolated online Playwright 3/3; production client/server
build and static-host generation PASS. Generated CSP contains the Render and configured
Supabase origins without localhost/127.0.0.1 and without enabled provider frames.
Changed-file secret scan and diff whitespace checks PASS. The existing main bundle size
warning remains deferred to measured Stage 10.7 work. Stage 10.1 migrations and profile
flows remain intact. Unrelated Phase 9 audit/readiness files are excluded from staging.
