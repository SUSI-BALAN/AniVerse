# AniVerse Phase 10 — Stage 10.1 handoff

Status: implementation and local/isolated verification complete. Not pushed or deployed. Stage 10.2 has not started. Phase 9 hosted verification remains closed.

## Behavior

- `/profile` is lazy-loaded and protected in cloud mode; local mode requires no login.
- Display names are trimmed, preserve Unicode without normalization, require visible content, reject Unicode control characters, and allow at most 40 Unicode code points.
- Six preset avatars use existing bundled Lucide icons. No uploads or external image origins were introduced.
- GET returns defaults without creating a row. PATCH atomically creates or updates the authenticated owner's profile. Partial updates preserve other fields.
- Account email and joined date come only from the verified Supabase identity. Missing joined date is unavailable. Local mode has no fake account identity.
- Profile responses omit internal user IDs and use the existing private `no-store` middleware. Unsupported fields are rejected; legacy userId/user_id/ownerId hints are ignored.
- Existing authentication, session refresh, identity-change remount, exact CORS/CSP, strict database TLS, rate limiting, and safe logging are preserved.
- Profile rendering does not consume LibraryContext or trigger library refreshes. Export reuses DataTransfer's existing library backup action in export-only mode; the existing backup format was not extended with profile fields.
- Desktop account navigation and Settings link to Profile; the existing mobile Settings entry remains available.

## Migration

`server/migrations/postgres/002_profiles.sql` is in the directory consumed by the existing migration runner. The requested `server/migrations/002_profiles.sql` location would not be discovered; no duplicate migration was created.

The migration adds one owner-scoped profile per auth user, bounded names and avatar IDs, timestamps, cascading ownership, RLS and explicit SELECT/INSERT/UPDATE/DELETE owner policies. The primary key supplies the needed lookup index. Migration 001 is unchanged. SQLite initialization adds equivalent local storage without replacing existing data.

Only the isolated local PostgreSQL 17 database was migrated. Its ledger records 001 and 002 exactly once. Repeated migration execution leaves ledger entries and application data unchanged. Production Supabase was not migrated.

## Observed verification

- Focused API/SQLite: 19 passed.
- Focused client: 15 passed.
- Full client: 56 passed, 0 failed.
- Full server with isolated PostgreSQL: 122 passed, 0 skipped, 0 failed, including 6 new PostgreSQL profile tests and 2 trusted-auth metadata tests.
- Direct RLS verifies own access, foreign SELECT/UPDATE/DELETE rejection, INSERT rejection, and ownership-transfer rejection.
- PostgreSQL/SQLite field and timestamp parity, Unicode validation, concurrent partial writes, database constraints, cascading ownership and non-destructive local initialization passed.
- Local Playwright: 9 passed, including mobile profile navigation, keyboard avatar selection, save/refresh persistence and existing export download.
- Isolated online Playwright: 2 passed, including cloud login, profile editing, refresh, logout and A/B isolation. No production credentials were used.
- Client/server typecheck passed.
- Production client/server build and static-host generation passed with the real hosted API origin supplied only to the build process.
- Generated CSP contains Render and Supabase origins and no localhost. No security configuration was weakened.
- Stage files passed secret/certificate scanning and git diff whitespace checks.

The readiness test's mocked applied-migration list was extended to include 002; production readiness logic was unchanged. The existing large-bundle warning remains deferred to the approved performance stage.

## Stage files

### Frontend

- client/src/App.tsx
- client/src/components/DataTransfer.tsx
- client/src/components/Navbar.tsx
- client/src/pages/SettingsPage.tsx
- client/src/pages/ProfilePage.tsx
- client/src/pages/ProfilePage.test.tsx
- client/src/services/profileApi.ts
- client/src/services/profileApi.test.ts
- client/e2e/profile.spec.ts
- client/e2e-online/profile.spec.ts

### Backend

- server/src/app.ts
- server/src/database/schema.sql
- server/src/middleware/auth.ts
- server/src/repositories/repository.contracts.ts
- server/src/repositories/repositoryFactory.ts
- server/src/repositories/profile.repository.ts
- server/src/routes/profile.routes.ts
- server/src/types/auth.types.ts
- server/src/types/profile.types.ts
- server/src/utils/profileValidation.ts
- server/migrations/postgres/002_profiles.sql
- server/test/phase9.hardening.test.ts
- server/test/phase10.profile.test.ts
- server/test/phase10.profile-postgres.test.ts
- server/test/phase10.profile-auth.test.ts

This handoff is the remaining Stage 10.1 documentation file.

## Preserved unrelated work

- docs/PHASE9_RENDER_READINESS.md
- docs/PHASE9_HOSTED_SMOKE_RESULTS.json
- scripts/verify-hosted-phase9.mjs

No unrelated work was deleted or included in commit preparation.

## Deferred scope

Avatar uploads, account deletion, library overhaul, discovery, recommendations, PWA, broad performance/observability cleanup and provider enablement remain outside Stage 10.1. Remaining Stage 10.1 implementation blockers: none. Deployment requires separate approval and production migration/deployment verification at that time.
