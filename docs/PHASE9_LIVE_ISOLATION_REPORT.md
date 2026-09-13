> Closure update: the three failed gates below are now resolved. See [closure report](PHASE9_ISOLATION_CLOSURE_REPORT.md). Earlier results are retained as historical evidence.

# ANIVERSE USER A/B ISOLATION & RLS REPORT

Verified using real Supabase password login, authenticated REST RLS, live AniVerse API, strict PostgreSQL TLS, and isolated in-memory SQLite. No signup, migrations, deployment, or Phase 10.

| # | Check | Result |
|---|---|---|
| 1 | User A login | PASS |
| 2 | User B login | PASS |
| 3 | Distinct identities | YES |
| 4 | Unauthorized API | PASS |
| 5 | Authorized API A | PASS |
| 6 | Authorized API B | PASS |
| 7 | Favorites A | PASS |
| 8 | My List A | PASS |
| 9 | Settings A | PASS |
| 10 | Search History A | PASS |
| 11 | Recently Viewed A | PASS |
| 12 | Progress A | PASS |
| 13 | Watch History A | PASS |
| 14 | BIGINT normalization | PASS |
| 15 | JSONB normalization | PASS |
| 16 | Timestamp normalization | PASS |
| 17 | Genre normalization | PASS |
| 18 | Stats A | PASS |
| 19 | Recommendations A | PASS |
| 20 | Export A | PASS |
| 21 | User B initial isolation | PASS |
| 22 | Favorites B | PASS |
| 23 | My List B | PASS |
| 24 | Settings B | PASS |
| 25 | Search History B | PASS |
| 26 | Recently Viewed B | PASS |
| 27 | Progress B | PASS |
| 28 | Watch History B | PASS |
| 29 | Forged userId attack | PASS |
| 30 | Cross-user read | FAIL |
| 31 | Cross-user update | PASS |
| 32 | Cross-user delete | FAIL |
| 33 | RLS SELECT | PASS |
| 34 | RLS INSERT | PASS |
| 35 | RLS UPDATE | PASS |
| 36 | RLS DELETE | PASS |
| 37 | Favorites RLS | SELECT PASS; MUTATION PASS |
| 38 | Watchlist RLS | SELECT PASS; MUTATION PASS |
| 39 | Settings RLS | SELECT PASS; MUTATION PASS |
| 40 | Search History RLS | SELECT PASS; MUTATION PASS |
| 41 | Recently Viewed RLS | SELECT PASS; MUTATION PASS |
| 42 | Episode Progress RLS | SELECT PASS; MUTATION PASS |
| 43 | Watch History RLS | SELECT PASS; MUTATION PASS |
| 44 | Stats A/B isolation | PASS |
| 45 | Recommendations A/B isolation | PASS |
| 46 | Export B | PASS |
| 47 | Local ? Cloud import | SELECT undefined; MUTATION undefined |
| 48 | Malicious backup ownership | PASS |
| 49 | Cloud export after import | PASS |
| 50 | Cloud ? Local portability | SELECT undefined; MUTATION undefined |
| 51 | Re-login User A | PASS |
| 52 | Session refresh | PASS |
| 53 | Session failure behavior | PASS |
| 54 | Logout | PASS |
| 55 | Browser-only checks | MANUAL |
| 56 | Error response security | PASS |
| 57 | Log secret leakage | PASS |
| 58 | Cleanup | PASS |
| 59 | Remaining blockers | Cross-user read/delete HTTP status; duplicate merge summary |
| 60 | Ready for HOSTED DEPLOYMENT VERIFICATION? | NO |

Failed gates:

- Cross-user read: HTTP 200/null; required 403/404. User A row remained invisible.
- Cross-user delete: HTTP 200/removed:false; required 403/404. User A row remained unchanged.
- Duplicate merge summary: repeat imports correctly merge rows, but duplicatesMerged remains 0.

Browser cache clearing, UI import and account switching remain MANUAL. Session revocation rejected refresh and returned API 401. Backend logs inspected: no detected secrets. Temporary rows removed and settings restored; existing SQLite and accounts retained.

Configuration repair: renamed the configured certificate variable to DATABASE_CA_CERT_PATH after certificate validation. Backend restored; no migrations executed.
