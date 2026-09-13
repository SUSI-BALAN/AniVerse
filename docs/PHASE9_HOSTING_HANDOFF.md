# Phase 9 hosting handoff

Local and real Supabase isolation verification is complete. Actual hosted verification is blocked pending a real GitHub repository, backend hosting target, and frontend site. `netlify.toml` identifies Netlify build configuration; it does not prove a site exists. The Dockerfile is portable backend packaging, not a configured hosting provider.

GitHub Actions already provisions PostgreSQL 17, sets `TEST_DATABASE_URL`, and runs install, typecheck, client/server tests, migration/repository/security integration tests through the server suite, build, local/mocked-online Playwright, and dependency audit. The production dependency audit is required; the full development dependency audit is advisory. CI activation and green results require an actual GitHub push and observed Actions run.

## Runtime CA strategy

The public Supabase CA remains intentionally local and excluded from Git and Docker context. On the chosen Linux backend host, use its read-only file/secret-mount mechanism to supply that public CA at `/app/certs/prod-ca-2021.crt`, and configure `DATABASE_CA_CERT_PATH` to that runtime file. If the host has another runtime root, use its actual absolute mount path. Do not use a Windows path, `DATABASE_SSL_CA_PATH`, disabled TLS verification, or global TLS overrides. The current Docker runtime does not supply this file automatically.

Verify the mounted certificate is readable, a valid unexpired PEM CA, and the actual host can perform `SELECT 1` with strict PostgreSQL TLS before its production migration. `npm run start:online` runs the existing migration command before the production Node server; startup checks the migration ledger. Do not run host migrations until its actual environment is configured.

## Required hosting inputs

- Real GitHub repository and authenticated push access.
- Backend provider/service, production HTTPS URL, environment/log access, and CA mount mechanism.
- Netlify site or explicitly selected alternative frontend host, production HTTPS origin, and build/environment access.
- Backend `CLIENT_ORIGIN` exactly matching that origin; proxy-hop topology for `TRUST_PROXY`.
- Supabase allowed site/redirect URLs matching the actual frontend.

Configure backend production, postgres/Supabase modes, strict TLS, pool sizing, Supabase configuration, origin, proxy and build ID in host environment settings. Configure only the browser-safe Vite Auth/API/Supabase variables on the frontend build host. Existing local environment files are not production configuration and must remain uncommitted.

Root `npm run build` generates Netlify-compatible HTML CSP/security headers and SPA fallback. Verify their actual hosted responses, including required API/Supabase connect origins and disabled-provider `frame-src`, rather than treating generated files as delivered headers. No live hosted build can be finalized using the current localhost API setting.

## Recovery

Use the Supabase plan's managed database backups/PITR where available and retain per-user AniVerse JSON exports. Before a schema change, take a provider backup and verify the next additive migration in isolated staging. Restore only to an isolated staging database, verify the migration ledger and repository/import tests, then follow the provider's approved cutover procedure. Keep the prior application version available; do not automatically reverse migrations or overwrite production for a restore drill. See `PHASE9_DEPLOYMENT.md` for existing backup/export guidance. Hosted restore drill is documented and deferred until isolated staging exists.

No deployment, host migration, account signup, or Phase 10 has been performed by this preparation.
