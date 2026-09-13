# Phase 9 Render Web Service preparation

Status: preparation only. Do not deploy until the exposed database and both live-test passwords are rotated and verified. Never copy live-test credentials to Render or Netlify.

## Service settings

- Repository: https://github.com/SUSI-BALAN/AniVerse
- Branch: main
- Runtime: Node
- Root directory: leave blank (repository root)
- Build command: `npm ci --include=dev && npm run build --workspace server`
- Start command: `npm run start:online`
- Health check path: `/api/ready`
- Use a supported Node version satisfying the repository's Node >=20 requirement.

The build explicitly installs development dependencies required by TypeScript. The existing root `start:online` script runs `migrate:postgres` and only then `start`; a failed migration prevents server startup. No migrations were executed during this preparation.

## Environment variable names

`NODE_ENV`, `DATABASE_MODE`, `AUTH_MODE`, `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_SSL`, `DATABASE_CA_CERT_PATH`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLIENT_ORIGIN`, `ANILIST_API_URL`, `ANILIST_TIMEOUT_MS`, `BUILD_ID`, `TRUST_PROXY`.

Render supplies `PORT`; the application reads it. Set the nonsecret modes to `NODE_ENV=production`, `DATABASE_MODE=postgres`, `AUTH_MODE=supabase`, and `CLIENT_ORIGIN=https://aniplayers.netlify.app`. Set `DATABASE_SSL=true`. Preserve the verified Session Pooler connection on port 5432 with the rotated password. Store the private URI and key through host environment configuration only. Choose `TRUST_PROXY` for the verified proxy topology; do not enable broad trust. Keep all playback providers disabled.

## Certificate strategy

At deployment time add the existing public `prod-ca-2021.crt` as a Render secret file with that exact filename. Set `DATABASE_CA_CERT_PATH=/etc/secrets/prod-ca-2021.crt`. This absolute runtime mount avoids dependence on the host checkout directory and Windows paths. Render documents secret-file mounts at `/etc/secrets/<filename>`: https://render.com/docs/configure-environment-variables

Keep `rejectUnauthorized=true`; never set `NODE_TLS_REJECT_UNAUTHORIZED=0`. Validate SELECT 1 and strict TLS after rotation and again on the host before declaring deployment verified.

## Frontend integration after backend deployment

Once Render assigns a real HTTPS backend URL, configure Netlify `VITE_API_BASE_URL` with that URL and rebuild. Verify exact-origin CORS, hosted health/readiness/version, existing-account sign-in, session persistence and the A/B Favorite smoke test. Until then frontend API integration remains blocked. Do not substitute localhost or invent a backend URL.

This file creates no Render service and changes no Supabase configuration, migrations, RLS policy, authentication architecture or secret file.
