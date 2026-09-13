# Phase 9 local backend restart closure

Verified 2026-09-13. The local backend regression is closed; Render was not deployed.

## Cause and repair

The old production process was still serving port 4000 after the database password rotation. Its retained logs showed authenticated GET /api/favorites returning 500 INTERNAL_ERROR and readiness returning 503. The application parses its environment once and creates a singleton PostgreSQL pool, so editing server/.env does not refresh an already running process.

Stopped only the identified AniVerse backend watcher and old production listener. Started `npm run start --workspace server` from the repository root, which runs the server workspace with its current private environment. No application-code, schema, migration, RLS, authentication or Netlify changes were needed for this repair. Existing unrelated working-tree edits were preserved.

The failure is consistent with stale pre-rotation pool configuration: restarting alone restored readiness and both authenticated reads. The old error logger retained only a safe generic category, not the underlying driver stack or SQLSTATE; those details cannot be asserted retrospectively.

## Verification

- Fresh server listens on port 4000 in PostgreSQL/Supabase mode.
- /api/health, /api/ready and /api/version: HTTP 200 before and after the smoke test.
- Readiness executes SELECT 1 and migration-ledger checks through the same singleton pool used by Express repositories. The configured pool uses the CA file and rejectUnauthorized=true.
- Real User A and B logins succeeded, with confirmed emails and distinct identities compared internally.
- GET /api/favorites returned HTTP 200 with arrays for both users. Without a token it returned 401 AUTH_REQUIRED.
- Each user created one unique temporary Favorite and read it back. The other account received 404 RESOURCE_NOT_FOUND for that item. Both temporary records were removed by their owners.
- Runtime logs inspected contained structured request metadata and no credential/token fields. Tracked-secret scan passed.
- Server typecheck and production build passed.
- Full server suite: 19 files, 95 tests passed, no skips, including real PostgreSQL integration, shared contracts, authorization, ownership and normalization coverage.

Test command used NODE_ENV=test, DATABASE_MODE=sqlite, AUTH_MODE=local, and TEST_DATABASE_URL targeting a dedicated database on the existing isolated loopback PostgreSQL instance at port 55439. Production was not used by the automated suite. `npm run test:run --workspace server -- --no-file-parallelism` passed. The initial parallel run encountered concurrent fixture-schema creation in the shared test database; sequential execution avoided that fixture race. The isolated PostgreSQL instance was stopped afterward; the repaired backend remains running.

Netlify returned HTTP 200 and was not redeployed or reconfigured. Supabase hosted redirect configuration remains MANUAL CHECK REQUIRED for https://aniplayers.netlify.app.

Ready for Render backend deployment: YES for the local regression gate. Phase 9 fully complete: NO; actual hosted backend deployment and end-to-end hosted verification remain outstanding.
