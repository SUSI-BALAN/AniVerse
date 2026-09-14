# AniVerse Stage 10.7 performance verification

## Measurement method

The Stage 10.6 production build (`a23f796`) is the baseline. Bundle sizes are
the Vite output sizes, not transferred gzip sizes. Browser request counts use
the existing deterministic local and isolated-cloud Playwright fixtures. The
local Home graph includes development StrictMode and the compact
LibraryContext initialization; those duplicate initialization requests are
called out rather than hidden. Local timing includes Vite compilation and is
not presented as production latency.

## Baseline audit

The eager entry contained Home, AnimeCard, AnimeHero, AnimeSection, PageTransition,
AuthContext and LibraryContext. All infrequent route pages were already lazy.
Framer Motion was imported by the eager Home/layout path, while Drawer remained
route-level. AnimeImage already lazy-loaded non-critical images; only the active
Home hero and detail-page media were eager. The service worker had no API cache
and added no API requests. AuthContext still loads Supabase eagerly to preserve
session correctness in cloud mode; no unsafe deferral was attempted.

## Changes

Simple eager-path opacity, translate and hover effects now use CSS classes and
the existing reduced-motion media rule. Framer Motion remains available for the
lazy Drawer feature. No route behavior, API contract, cache policy, image URL,
recommendation budget, database query, or provider behavior changed.

## Bundle comparison

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Main entry JS | 674.15 kB | 546.95 kB | -127.20 kB (-18.9%) |
| Main entry gzip | 202.84 kB | 160.59 kB | -42.25 kB (-20.8%) |
| CSS | 34.82 kB | 35.29 kB | +0.47 kB (+1.3%) |
| Largest lazy chunk | 14.14 kB | 128.81 kB | +114.67 kB |
| Total JS output | 760.25 kB | 761.86 kB | +1.61 kB (+0.2%) |
| PWA assets | unchanged | unchanged | 0 |

The largest lazy chunk is Drawer and contains the deferred Framer Motion
dependency. The main entry is the actual initial Home script, so this is not a
same-byte move into an immediately requested child. The existing Vite warning
for chunks above 500 kB remains and is now lower by 127.24 kB; deeper route and
dependency analysis remains future work only if later evidence warrants it.

## Request and payload comparison

| Flow | Before | After | Notes |
| --- | --- | --- | --- |
| Local Home | 13 GETs, 4 public, 7 private, 1 `/api/home` | 13 GETs, 4 public, 7 private, 1 `/api/home` | unchanged by this stage |
| Signed-out Home | 6 GETs including two version checks, 4 public, 0 private | same | no private requirement |
| Browse filter Apply | 1 initial + 1 Apply catalog request | same | existing Stage 10.3 bound |
| Search query | 1 debounced catalog request | same | cancellation/dedup retained |
| Favorites page | 1 bounded library query | same | no full collection load |
| History page | existing bounded route queries | same | no API changes |

The current Home response graph recorded 11,523 total API response bytes and
2,359 bytes for `/api/home`; these vary with fixture state. Candidate sourcing
remains capped at six AniList calls. No duplicate catalog requests were added.

## Images and PWA

`AnimeImage` still uses eager loading only for the active hero and details media;
rails and grids remain lazy with fixed aspect-ratio containers. No unsupported
`srcset` URLs or broad service-worker image caching were introduced. Static
shell caching remains bounded to 60 runtime entries and bypasses API,
Authorization and Supabase requests. The service worker and manifest remain
`no-cache, must-revalidate`; hashed assets retain existing cache behavior.

## Database and memory

No database query or index changed, so no migration was required. Existing
recommendation coalescing removes completed and failed in-flight entries.
Home and catalog abort controllers, timers and service-worker listeners retain
cleanup paths. No identity-scoped private cache was added.

## Verification

- Client: 109 passed, 0 failed, 0 skipped.
- Server: 212 passed, 0 failed, 0 skipped with isolated PostgreSQL 17.
- PostgreSQL regression: existing isolated ownership/profile/library/
  recommendation coverage passed.
- Local Playwright: 19 passed, including Home/Browse/Search/Library/PWA checks.
- Isolated/cloud Playwright: 7 passed.
- PWA/offline Playwright: 3 passed.
- Typecheck and production build passed; manifest, worker, icons, `_headers` and
  `_redirects` generated. CSP retained exact Render/Supabase origins and no
  localhost values.

The prior Stage 10.6 output was measured with the same local fixture family;
historical production device timings and Lighthouse scores are unavailable.
No commit, push, deployment, Supabase change, provider change or database
migration was performed for Stage 10.7.
