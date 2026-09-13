# AniVerse

AniVerse is a local-first anime discovery application with optional authenticated PostgreSQL/Supabase deployment.

## Implemented

- React + Vite + TypeScript client
- Tailwind CSS global theme foundation
- Express + TypeScript server
- SQLite database location and schema baseline
- Health endpoint
- Environment configuration template
- Root scripts for local development
- AniList metadata service with normalized anime models
- Search, trending, popular, seasonal, browse, genres, and details APIs
- SQLite metadata cache with configurable TTLs
- Responsive Home, Search, Trending, Seasonal, Browse, and Anime Details pages
- Shared anime cards, loading skeletons, empty states, and friendly errors
- Vitest, React Testing Library, and Supertest coverage
- Cinematic rotating hero, touch-friendly anime rails, and centralized visual tokens
- Responsive desktop and mobile navigation, compact footer, filter drawer, and 404 page
- Reduced-motion support, route transitions, scroll restoration, and keyboard-visible actions
- Playwright coverage for desktop/mobile layouts and core discovery journeys
- Local provider registry and safe embed-resolution API for Cinextream, Yenime, and disabled Zokoanime scaffolds

Phase 9 preserves the full SQLite/local experience while adding an explicit PostgreSQL + Supabase Auth online mode. See `docs/PHASE9_DEPLOYMENT.md` for migration, security, deployment, and backup guidance.

## Provider architecture (Phase 5)

AniList remains the metadata authority. When playback is eventually requested, the client will send validated AniList/MAL identifiers, episode, language, and provider ID to `POST /api/providers/resolve`. The server-side `ProviderManager` delegates to a provider adapter and returns a validated HTTPS embed URL plus its approved iframe origins. The client never constructs provider URLs and resolved URLs are never stored in SQLite.

The watch route (`/watch/:animeId/:episode`) renders only the selected, server-resolved provider iframe. It supports explicit server/language switching, episode navigation, loading/error states, and origin-validated player messages. The iframe uses fullscreen, autoplay, encrypted-media, and picture-in-picture permissions required by common documented players; no sandbox is added because it can break provider-supported scripts and is not a substitute for the server-side origin allowlist.

Provider configuration is intentionally opt-in and requires an operator-verified path template:

```text
CINEXTREAM_ENABLED=true
CINEXTREAM_BASE_URL=
CINEXTREAM_EMBED_PATH=
YENIME_ENABLED=true
YENIME_BASE_URL=
YENIME_EMBED_PATH=
ZOKOANIME_ENABLED=false
ZOKOANIME_BASE_URL=
ZOKOANIME_EMBED_PATH=
DEFAULT_PROVIDER=cinextream
```

The current public Cinextream documentation describes an AniList anime route but leaves its language segment as `lang`; Yenime documents MAL-ID embeds and SUB/DUB support but does not expose a concrete iframe path in the accessible documentation. AniVerse therefore keeps both adapters `MISCONFIGURED` until their exact documented path is supplied. Zokoanime remains `DISABLED` because no current public anime embed documentation was verified. No stream files, HLS URLs, provider scraping, or proxying are performed.

Provider endpoints:

- `GET /api/providers`
- `GET /api/providers/:providerId`
- `POST /api/providers/resolve`

## Local Development

Install dependencies:

```powershell
npm.cmd install
```

Start both apps:

```powershell
npm.cmd run dev
```

Expected URLs:

- Client: http://localhost:5173
- Server: http://localhost:4000
- Health: http://localhost:4000/api/health

Run unit and API tests:

```powershell
npm.cmd run test:run
```

Install the local Playwright browser once, then run responsive browser tests:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "client/.playwright"
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

## Metadata API

- `GET /api/anime/search?q=naruto`
- `GET /api/anime/trending`
- `GET /api/anime/popular`
- `GET /api/anime/seasonal`
- `GET /api/anime/browse`
- `GET /api/anime/genres`
- `GET /api/anime/:id`

AniList is an external dependency. AniVerse shows an unavailable state when its public API is down and never substitutes scraped metadata.

## Legal Boundary

AniVerse is designed to use AniList for metadata and only provider-supported iframe/player integrations for playback. It must not download, proxy, extract, re-host, or bypass protections for video streams.
