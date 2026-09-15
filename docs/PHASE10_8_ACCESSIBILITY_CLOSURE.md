# Stage 10.8 accessibility closure

## Diagnosis and audit before closure edits

The Home fixture gives both favorite 201 and completed 702 the same recommendation (2).
The engine chooses the stronger favorite reason in broad discovery; Home allocates that
candidate to For You and suppresses it in the lower-priority source rail. This is fixture
collision (C), not a Stage 10.8 production-copy regression. Give completed 702 its own
candidate and verify its structured source reason and removal after progress invalidation.

Shared audit: initial route focus bypasses the first skip-link tab stop; raw pathname
announcements expose IDs; outer Suspense hides the shell. Saved motion preference does
not disable all CSS/Drawer motion. Overlay traps do not isolate background content and
the earlier inert attempt disabled an ancestor of the modal. Use a body portal and
isolate sibling roots, preserving previous inert state. History is a tab interface;
My List now uses a labeled native status select, not tabs. Keep that distinction.

Forms have labels/autocomplete; Auth errors lack field linkage. Decorative image
fallbacks incorrectly announce an unavailable image. Hero slide dots are undersized.
White danger-button text needs measured contrast review. Existing progressbar, radio
avatars, search combobox, navigation current-state, private ownership and PWA policies
are reused. Route, axe, keyboard, contrast, reflow and regression results follow below.

Guidance: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ and
https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ and
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html.

MANUAL SCREEN READER AUDIT: DEFERRED

## Route audit

All routes have exactly one `main`, one visible `h1`, persistent header/footer
landmarks, named navigation, keyboard-operable controls, and a concise pathname-only
polite route announcement. Query-only updates do not move focus or announce a route.

| Route | Route-specific evidence | Result |
| --- | --- | --- |
| `/` | carousel name/pause/slide controls, decorative backdrop, named rails and truthful visible reasons | PASS |
| `/browse` | heading, URL-backed filters, mobile modal Drawer, grid/list results and pagination | PASS |
| `/search` | labeled combobox/listbox/options, active option, Escape/Enter/arrows, status and paging | PASS |
| `/trending`, `/seasonal` | headings, named result collections, meaningful poster alternatives | PASS |
| `/anime/:id` | detail heading, labeled actions/menu, progress text and keyboard menu | PASS |
| `/favorites`, `/my-list` | headings, labeled collection regions, filters, view state, empty/loading states | PASS |
| `/history` | APG tabs with arrows/Home/End and associated tabpanel | PASS |
| `/profile`, `/settings` | labels, validation/error linkage, busy/status messaging and confirmation dialog | PASS |
| `/stats` | heading, textual statistics and non-color-only states | PASS |
| `/login`, `/register` | labels, autocomplete, invalid/described-by linkage and submit busy state | PASS (online harness) |
| `/watch/:id/:episode` | heading, episode/server controls, textual playback status and progress | PASS |

## Automated violation record

Thirteen local routes plus login/register were scanned with `@axe-core/playwright`
against WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. Final critical, serious, moderate,
and minor violations: zero. Earlier real findings were low-contrast `text-zinc-500`
metadata and prohibited naming on an untyped element; both were fixed rather than
suppressed. No rules are globally disabled and axe is a dev-only dependency.

## Interaction and viewport evidence

- Skip link is the first useful Tab target on Home and Browse; Enter focuses `main`.
- Client-side pathname navigation focuses `main` once. Filters, pagination, search
  query changes, favorites, and refreshes preserve working focus.
- ConfirmDialog and Browse/Library Drawers portal to `body`, trap forward/reverse Tab,
  close with Escape, restore trigger focus, and make `#root` natively inert while open.
- History supports ArrowLeft/Right, Home and End. My List is not a tab interface and
  correctly retains native labeled status controls.
- Keyboard-only Home -> Browse -> filters -> anime -> Favorite -> My List -> Profile
  -> Settings passed using Tab, Enter, arrows and Escape.
- System and saved reduced-motion preferences suppress hero rotation and nonessential
  CSS/Drawer motion. Intentional horizontal anime rails remain available.
- 200% desktop zoom equivalent (1280 to 640 CSS px), 320x844, 390x844, 640x400 and
  844x390 route matrices passed without body overflow; dialogs remained reachable.
- Representative palette ratios: body 18.36:1, muted 7.55:1, links 9.41:1,
  primary 18.36:1, secondary 16.06:1, danger 7.43:1, error 9.87:1,
  success 10.71:1, chip 16.06:1, focus ring 8.82:1.

## Final verification (2026-09-15)

- Home failing scenario alone: 1 passed, 0 failed, 0 skipped.
- Accessibility Playwright: 22 passed, 0 failed, 0 skipped.
- Complete local Playwright: 41 passed, 0 failed, 0 skipped.
- Isolated PostgreSQL/cloud Playwright: 9 passed, 0 failed, 0 skipped.
- PWA/offline: local offline shell/private-network-only scenarios and cloud A/B cache
  isolation/offline recovery passed within the two suites above.
- Client Vitest: 36 files, 114 passed, 0 failed, 0 skipped.
- Server Vitest: 28 files, 212 passed, 0 failed, 0 skipped, including real isolated
  PostgreSQL repository/RLS coverage.
- Typecheck: client PASS; server PASS.
- Build: client PASS; server PASS; static host PASS. `_headers`, `_redirects`,
  `manifest.webmanifest`, and `sw.js` were generated.
- Main initial JS: 548.90 kB minified (161.12 kB gzip), +1.95 kB from Stage 10.7.
  Total initial JS is 548.90 kB; axe is absent from production chunks.
- Database migration: NONE. The isolated test database received existing migrations
  only as required by the test harness; no migration 003 exists.
- Security: server ownership/RLS/CORS/CSP/rate-limit/no-store/logging tests passed;
  private API/Auth requests remain excluded from PWA caching; providers remain disabled.
