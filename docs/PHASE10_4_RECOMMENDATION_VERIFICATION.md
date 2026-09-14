# Stage 10.4 recommendation verification

Implementation and isolated verification only. No migration, production settings change,
commit, push, deployment, provider enablement, or Stage 10.5 work.

## Audit and architecture

Previously SQLite ranked in `recommendation.service.ts` using cached genres and one
popular page. PostgreSQL independently ranked in `userInsights.routes.ts`, adding a
vote for every episode. Both stats routes repeated genre aggregation. Exclusions and
Because You Watched source selection differed. Home discarded explanations.

Both adapters now supply existing owner-scoped repository records to the same signal
normalizer and engine. Stats uses the same genre preference calculation. SQLite
history now includes its already-stored genres, matching cloud history signals.
No schema or backup-format change is required.

## Explicit rules

- One signal per AniList ID. Use the strongest base interaction, never the sum of
  episodes: favorite 5, whole-series completion 4, meaningful progress/history 3,
  watchlist 2, viewed 1. WATCHING has progress strength. Repeat views add no weight.
- Meaningful progress requires 30 seconds or a completed episode; history requires
  5% or completion. A completed episode alone does not mean a completed series.
- Series completion requires COMPLETED watchlist status, or all episode numbers
  1..N completed with a known total N. Unknown totals do not fabricate completion.
- Recency multiplier: `1 + 0.25 / (1 + ageDays / 90)`. Future dates use zero age;
  unavailable dates use 1. Final title strength is capped at 6. Old preferences
  retain their full base strength. Split each title's vote across distinct genres.
- General discoveries exclude favorites, completed, listed, currently watching,
  and meaningfully watched titles; viewed-only titles can remain discoverable.
  All modes use identical rules. Adult candidates and duplicates are removed.
- Preference score is 0..40 (0..20 for one signal), source similarity 0..15,
  catalog quality 0..5. Popularity is only an equal-score tie-breaker, then anime ID.
  A repeated primary genre incurs a deterministic 3-point penalty per prior pick.
- Reason priority: sequel continuation, supported source-title similarity, actual
  genre preference, truthful catalog origin. Numeric scores are not returned.
- SEQUEL relations of completed sources form a separate continuation list.
  General and Because You Watched similarity lists do not substitute relations for
  AniList recommendations. Already-owned/completed sequels remain excluded.
- Cold start uses Popular and Top Rated pages with catalog reasons and explicit
  non-personalized metadata. No aggregate AniVerse-viewer claim or external AI.

## Budgets, cache, contracts and invalidation

Five repository reads per recommendation calculation. Two public pages, at most two
genre pages, at most two source details calls: **maximum six catalog calls**. Pages
are sliced to 25; each details source contributes at most 12 title recommendations
and 12 sequels. Maximum 148 candidates and 20 results. No request per episode.
Existing AniList TTLs, canonical keys and coalescing are reused. Per-owner concurrent
calculation promises are released after success or failure; there is no shared
personalized result cache. Partial source failure is explicitly reported; total
failure returns safe 503 RECOMMENDATIONS_UNAVAILABLE and can be retried.

Existing recommendation arrays and reason strings remain supported; reasonType,
explanation and personalized fields are additive. New `/api/recommendations/home`
bundles discovery, title similarity and continuations in one request, suppressing
adjacent Home duplicates without removing picks from the legacy endpoint.
All private responses retain authentication and no-store. Ownership comes only
from verified identity; query-supplied ownership has no influence.

Home displays visible, wrapping explanations and honest fallback labels. It listens
to existing focused library revisions and successful progress-write events, with
100 ms coalescing. It waits for initial library initialization, ignores stale replies,
and hides data belonging to a previous identity. It never refreshes full collections.

## Observed verification on 2026-09-14

| Gate | Observed result |
| --- | --- |
| Client full suite | 28 files, 89 passed, 0 failed, 0 skipped |
| Server full suite, isolated PostgreSQL 17 available | 27 files, 204 passed, 0 failed, 0 skipped |
| Selected integration/regression run | 8 files, 50 passed; includes 35 real PostgreSQL, 7 SQLite parity, 8 pg-mem checks |
| New recommendation server coverage | 15 engine + 9 service/API + 4 real PostgreSQL tests |
| Local Playwright | 14 passed, 0 failed, 0 skipped |
| Isolated cloud Playwright | 5 passed, 0 failed, 0 skipped |
| Typecheck | Client and server PASS |
| Build | Client, server, static-host PASS |
| Generated static policy | Headers/redirects present; Render/Supabase origins; no localhost; frame-src none |

Integration coverage includes migration ledger/idempotency, profile, library,
history-only recommendation parity, search-history clear/export/import isolation,
RLS and transactional rollback. Browser coverage includes prior profile/library/
discovery scenarios plus local reason updates and separate cloud A/B explanations.
Synthetic catalog/auth fixtures are used; no production accounts or Supabase data.
The isolated test cluster was initially stopped and is stopped again after testing.

## Performance evidence and limits

Latest full-server deterministic fixtures (mocked public catalog, real SQLite reads):

| History rows | Normalized anime | Unique candidates | Catalog calls | Repository reads | Calculation duration | Recommendation array bytes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 4 | 4 | 5 | 0.962 ms | 2145 |
| 1000 | 10 | 5 | 6 | 5 | 12.864 ms | 2190 |

These are local fixture observations, not hosted latency claims or maximum runtime
guarantees. A dedicated concurrency test proves two same-owner consumers share one
calculation. Existing AniList coalescing tests remain green. Episode signals are
collapsed before ranking; 100 Action episodes and 12 Comedy episodes contribute
equal completed-title strength rather than an 8x episode-count preference.

Historical timing baseline was not measured. The prior checkpoint source establishes
the single-popular-page candidate strategy and per-episode cloud accumulation;
no before/after latency improvement is claimed. Input processing still grows with
stored rows, while candidate queries and ranking input are capped. Real AniList
latency and relevance tuning need future authorized observation. The existing Vite
main-chunk size warning remains later-stage performance debt.
