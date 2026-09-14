# Stage 10.6 Mobile + PWA verification

## Architecture

AniVerse uses a small Vite-compatible service worker at `/sw.js`. It installs a
versioned application shell (root, manifest and local icons), serves navigations
from the network with an offline `index.html` fallback, and runtime-caches only
same-origin static script, style, font and image requests. Runtime entries are
bounded to 60. Activation removes older `aniverse-shell-*` caches.

Requests with an `Authorization` header, every `/api/` request, and Supabase
origins are network-only and are never written to Cache Storage. External anime
media is not cached by this worker. There are no private response caches,
session caches, background retries, or API changes. The update prompt waits for
the user to press Refresh; unmounting the runtime never reloads the page.

The manifest starts at `/`, scopes `/`, uses standalone display, dark AniVerse
colors, and local 192px and 512px any/maskable icons. Netlify static generation
sets `sw.js` and the manifest to `no-cache, must-revalidate`; hashed assets keep
the existing deployment behavior. The existing SPA fallback remains `/* /index.html 200`.

`NetworkStatus` listens to online/offline events and reports that cloud data
requires a connection. It does not claim private data is available offline.
The mobile navigation already used the bottom safe-area inset; the layout now
also reserves the inset below content and the header reserves the top inset.

## Measured verification

Before Stage 10.6, the Stage 10.5 local Home browser graph was 13 API GETs
(4 public catalog, 7 private, 2 version/config duplicates). Stage 10.6 adds no
Home/API requests. The PWA shell adds one manifest and one service-worker asset
to the build; runtime static caching is bounded and does not cache API responses.

The production build output changed from the Stage 10.5 baseline of a 674.09 kB
main JS chunk and 33.63 kB CSS to 674.09 kB-equivalent application code plus
the PWA runtime, with the observed current output at 674.15 kB JS and 34.82 kB
CSS. The CSS increase is from safe-area/PWA UI styles; no broad bundle split was
attempted. The existing large-chunk warning remains Stage 10.7 work.

## Verification results

- Manifest, icon references, service-worker policy and offline hook tests pass.
- Full client: 34 files, 109 passed, zero failed/skipped.
- Full server with isolated PostgreSQL 17: 28 files, 212 passed, zero failed/skipped.
- Local Playwright: 21 passed, zero failed/skipped (including three PWA/mobile scenarios).
- Isolated cloud Playwright: 7 passed, zero failed/skipped.
- Typecheck and production build pass; `_headers`, `_redirects`, manifest, worker
  and icons are generated.
- CSP retains the exact Render and Supabase origins and no localhost values.
- No migration, backend configuration, provider, deployment, push or commit was
  performed during implementation.

Lighthouse was not available in the local toolchain. Installability was verified
through manifest/icon/worker reachability and build inspection; a browser-native
Lighthouse score is therefore not claimed. Full offline service-worker execution
requires a production preview because development deliberately does not register
the worker, preventing stale production workers from interfering with Vite.
