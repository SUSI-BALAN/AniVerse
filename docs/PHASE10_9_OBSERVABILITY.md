# Stage 10.9 production observability

## Preimplementation audit

AniVerse already generated bounded request IDs, returned `X-Request-Id`, logged one
completion duration, returned safe error envelopes, exposed fast liveness, database
readiness and version endpoints, and closed HTTP/PostgreSQL on termination. AniList
used bounded timeouts and request coalescing; private responses were `no-store`; PWA
caching excluded private APIs. Gaps were direct console formatting, weak route names,
no centralized nested redaction, no dependency/cache events, and no client correlation.

## Implemented design

- The backend logger emits one-line JSON using a fixed event schema and async request
  context. It strips control characters, bounds strings/collections, handles cycles,
  redacts dangerous keys recursively, normalizes numeric/UUID route segments, and
  never serializes requests, responses, headers, SQL, rows or dependency payloads.
- Request completion includes request ID, method, normalized route, status, duration,
  authentication boolean and safe error code. Unexpected failures add one correlated
  `request.failed`; expected validation/auth/not-found remain info, 429 and dependency
  failures are warnings, unexpected failures are errors. Production omits debug events.
- Repository wrappers emit only failures and operations slower than the configurable
  `OBSERVABILITY_SLOW_MS` threshold (default 500 ms). They record operation and timing,
  never arguments, SQL, rows, URLs or user IDs.
- AniList records safe operation/timing/status, 429 Retry-After when numeric, and
  internal hit/miss/coalesced counters. Variables and search text are never logged.
- Recommendation and Home events contain counts, duration and fallback/partial flags,
  never titles, lists, profile data or history records.
- Startup contains only environment, build ID, port, database/auth modes and enabled
  provider names. Shutdown emits started/completed without delaying closure telemetry.
- Client API responses retain request ID, duration and retry attempt in a WeakMap.
  Standard errors contain code, message, request ID, retryability, status and a bounded
  category. Unexpected catalog errors show a short readable support reference.
- ErrorBoundary reports only category, normalized pathname, message code, request ID,
  public build identifier and timestamp. Development uses sanitized console output;
  production sends nothing externally. PWA update transitions use the same local-only
  abstraction. No telemetry endpoint, queue, cookie, identifier or persistent storage
  was added.

## Privacy policy

AniVerse observability is operational, not behavioral analytics. It does not collect
passwords, authorization values, cookies, tokens, sessions, email addresses, database
credentials, certificate content, profile fields, favorites, watch-history titles,
library payloads, search queries, form contents, SQL values or response bodies. There
is no Sentry, Datadog, New Relic, LogRocket, Mixpanel, Amplitude, PostHog, Analytics,
Prometheus, public metrics endpoint, or external telemetry service.

## Verification evidence

- Client Vitest: 37 files / 117 passed / 0 failed / 0 skipped.
- Server Vitest: 29 files / 222 passed / 0 failed / 0 skipped, including ten focused
  observability tests and isolated PostgreSQL/RLS coverage.
- Local Playwright: 42 passed, including 22 accessibility and one error-reference test.
- Isolated/cloud Playwright: 9 passed, including A/B account/cache isolation and PWA.
- Typecheck and client/server/static-host builds passed.
- Main JS: 551.00 kB minified / 161.89 kB gzip, +2.10 kB from Stage 10.8.
- Deterministic logger micro-measurement: 1,000 events in 7.63 ms, averaging 136 bytes;
  no machine-specific latency threshold is enforced.
- No database migration or telemetry persistence was added.
