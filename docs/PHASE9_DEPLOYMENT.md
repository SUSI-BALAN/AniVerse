# AniVerse Phase 9 deployment

AniVerse deliberately supports two explicit modes. Local development uses `DATABASE_MODE=sqlite` and `AUTH_MODE=local`; it retains the Phase 8 database and never prompts for login. Online deployment uses `DATABASE_MODE=postgres` and `AUTH_MODE=supabase` together.

## Production sequence

Run `npm run migrate:postgres` from a trusted deployment job before starting a PostgreSQL server. The ordered `schema_migrations` ledger makes this idempotent; do not recreate schemas at startup. `npm run start:online` combines migration-before-start with the deterministic production server command.

1. Create a Supabase project and enable the desired email/password policy.
2. Copy `server/migrations/postgres/001_user_data.sql` into the Supabase SQL editor, or set the server-only `DATABASE_URL` and run `npm run db:migrate:postgres` from a trusted deployment job.
3. Configure the backend from the root `.env.example`. `DATABASE_URL` and any database password are backend-only. AniVerse does not require a service-role key.
4. Configure the static client from `client/.env.example`. Only the Supabase URL and browser-safe publishable/anon key may use a `VITE_` prefix.
5. Build with `npm run build`, deploy `client/dist` to a static host with SPA fallback, and start the API with `npm run start --workspace server`.
6. Set `CLIENT_ORIGIN` to the exact HTTPS frontend origin. Set `TRUST_PROXY=1` only when the Node host has exactly one trusted reverse-proxy hop.
7. Check `/api/health` for process liveness and `/api/ready` for database readiness.

After deployment, run `SMOKE_API_BASE_URL=https://api.example.com npm run smoke` to verify health, readiness, and version without contacting playback providers.

The persistent Node backend should use the direct Supabase connection where IPv6 is available, or the dashboard-provided session pooler on IPv4-only hosting. A serverless deployment should use the transaction pooler and a very small application pool. Never derive or guess pooler hostnames.

## Ownership and RLS

Every PostgreSQL user-data query includes the authenticated user ID derived from the verified bearer token. The client cannot choose ownership. The migration also enables RLS and defines separate select/insert/update/delete policies requiring `auth.uid() = user_id` for defense in depth if the tables are accessed through Supabase APIs later.

## Portable local-to-cloud migration

1. In local mode, export the Phase 8 JSON backup from Settings.
2. Switch to the online deployment, create/sign into an account, and import that backup from Settings.
3. The online import validates the same versioned schema, runs in one PostgreSQL transaction, ignores any external ownership concept, and writes every row using the authenticated account ID.

AniVerse never uploads the SQLite database automatically.

Cloud import is authenticated, validates the versioned JSON backup, ignores ownership/database IDs, and commits all rows in one transaction. Settings labels the action “Import Local AniVerse Backup” and reports imported counts.

## Backups

Use the Supabase plan's managed backup/PITR features where available and periodically test restore procedures. Users retain a portable per-account JSON export. Database-wide `pg_dump` must run only from trusted operator tooling using the dashboard-provided direct connection; it is never exposed as an AniVerse API.

Before schema changes, take a provider backup, apply the next numbered migration in staging, run repository and ownership tests, then deploy. Rollback uses the provider backup or the prior application version; migrations are additive and are not automatically reversed.

## CSP and providers

The API emits a production CSP assembled from AniVerse, AniList image/API origins, the Supabase origin, and enabled providers' approved iframe origins. A separate static frontend host must mirror this policy in its hosting configuration. Providers with unclear public embedding permission should remain disabled through environment configuration.
