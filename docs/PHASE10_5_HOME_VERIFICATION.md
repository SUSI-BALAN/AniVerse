# Stage 10.5 Home audit and verification

## Preimplementation audit

Checkpoint: Stage 10.4 `bd183975b70910824c602d8015cd7e231d5b5211`.
Home uses four public pages (Trending, Popular, Seasonal, Top Rated), 20 items each.
Hero reuses Trending or Popular; no separate hero query. Private Home requests are
recommendations/home, stats, continue-watching and recently-completed. Application
LibraryContext separately initializes compact membership, searches and settings.
The no-auth cloud Home suppresses private requests. Local mode needs no login.

Stats and recommendation signals overlap. Uncancelled progress/stats effects are
susceptible to development StrictMode duplication and stale replies. Recommendations
already guard identity and use focused revisions. Continue Watching and completed
rails hide when empty, but recommendation fallback renders an empty rail. Progress
and stats failures disappear silently. Public rails load independently; private
secondary rails have inconsistent loading/error presentation. Hero pauses on hover
and system reduced motion, with no focus pause or persistent rotation control.
Saved reduced-motion preference is not connected to these Home animations.

Source-level normal graph: signed out = 4 public, 0 private; signed in/local = 4
public + 4 Home-private + 3 app-private initialization requests. Actual development
browser counts and payloads will be recorded before implementation; these source
counts are not claimed as measured network counts.

Measured before editing Home, using the local browser fixture: 19 API GETs = 4
public catalog + 13 private + 2 version/config checks. One recommendation bundle.
5,204 response bytes observed; usable public card milestone 7,717 ms (cold local
Vite compilation included, not a production timing benchmark). StrictMode duplicated
three app initialization and three unguarded private Home effects. No full library
collections were fetched. Signed-out source graph is 4 public + version checks;
an isolated browser signed-out measurement is included in final verification.

## Implementation and measured result

The additive private `GET /api/home` composes profile greeting, Continue Watching,
Recently Completed and the Stage 10.4 recommendation engine. Each logical section
returns ready/error independently. Existing recommendation endpoints remain intact.
`scope=personalized` skips profile/playback reads for favorite/watchlist/view changes;
`scope=activity` refreshes playback and recommendations without reloading profile.
There are no database migrations or production configuration changes.

Audience is cold with no meaningful favorite/watchlist/watched/completed titles,
light with one or two distinct titles, established with three or more. Ranking,
weights, recency and source selection remain the existing shared engine. Genre
discovery uses that engine on the same candidate pool, with no extra upstream query.
Each Home rail is capped at ten items. Continuation, For You, source similarity,
then genre discovery allocate unique anime deterministically after Continue Watching.
Sparse candidate pools may suppress lower-priority rails; public catalog order is
never changed to deduplicate against private sections.

Public catalog calls remain independent, ten items per section instead of twenty.
Hero reuses those results. Private replies are no-store, compact and never include
account email or user UUID. Greeting appears only for a persisted profile.
Requests are aborted and stale responses ignored on identity change/unmount;
focused revisions are debounced 100 ms. Slow status appears after four seconds,
private requests have a 45-second deadline, and actual errors offer manual retry.
There is no automatic retry loop. Public content remains usable during private failure.

| Browser fixture graph | Before | After |
| --- | ---: | ---: |
| Local API GETs including app initialization | 19 | 13 |
| Public catalog GETs | 4 | 4 |
| Private GETs including app initialization | 13 | 7 |
| Home-specific private GETs | 4 logical / 7 observed | 1 |
| Recommendation/home summary bundle | 1 | 1 |
| Signed-out public/private GETs | Not measured | 4 / 0 |
| Signed-out total including version checks | Not measured | 6 |

The six remaining app-private requests are StrictMode's duplicated compact
membership/search/settings initialization; that context was not broadly refactored.
Current local representative total response bytes: 11,523; private Home bundle:
2,359 bytes. Earlier before total: 5,204 bytes. Fixture data changes between full
browser runs, so these totals do not prove a byte reduction. The contract bounds
rail counts and removes unused descriptions/backdrops/studios. Before public-ready
milestone 7,717 ms included cold Vite compilation; after 409 ms used warm compilation.
These are observed milestones, not a valid production latency speedup claim.
Recommendation candidate budget remains at most six catalog source calls and
148 distinct candidates regardless of episode-history size. Existing small/1,000-row
fixtures pass this bound; current runs used four/six calls respectively.

## Verification

- Full client: 31 files, 103 passed, zero failed/skipped.
- Full server with isolated PostgreSQL 17: 28 files, 212 passed, zero failed/skipped.
- Selected integration/regression: 9 files, 58 passed (37 real PostgreSQL,
  7 SQLite parity, 8 pg-mem, 6 Home SQLite/composition/API checks).
- Local Playwright: 16 passed, zero failed/skipped.
- Isolated cloud Playwright: 7 passed, zero failed/skipped, no hosted credentials.
- Typecheck: client/server passed.
- Production build/static-host: passed; `_headers` and `_redirects` generated.
- CSP: Render and configured Supabase origin retained; no localhost; frame-src none.
- Staged secret scan: recorded after final staging.

Profile, library, discovery, recommendation, export/import, scoped resets, RLS,
auth, CORS, TLS, rate limiting and safe error logs remain covered by regression suites.
Hero adds focus/hover pause and visible pause/play; hero and rail scrolling honor
system and saved reduced-motion preferences. Posters retain existing lazy loading.
Global card/CSS saved-motion integration remains Stage 10.8 work. The existing
large entry-chunk build warning remains Stage 10.7 work. Providers remain disabled.
No commit, push, deployment or production mutation is performed.
