# Setup and implementation audit

## 2026-09-13 — Step 1: instructions and discovery

Read the supplied AGENTS instructions and skills: hayeren, using-superpowers, brainstorming, writing-plans, test-driven-development, and browser. Commands: `pwd`, `rg --files`, `ls -la`, ancestor AGENTS reads, `node -v`, `npm -v`, `git status --short`. Outcome: empty Git repository with an existing `.tool-test` file; Node 24.15.0 and npm 11.12.1. Preserve existing file. No on-disk ancestor AGENTS found. User explicitly authorized full implementation, so proceed without redundant design approval.

## Step 2: architecture and verification plan

Create React/TypeScript/Vite with isolated pure game functions, validated storage, curated answer metadata and separately sourced accepted words, component UI, and tests. Armenian NFC lowercase; canonical և, and ու as one tile. Difficulty controls select from actual available lengths. Native modal dialogs provide focus trapping. Local fonts, light/dark themes, reduced-motion support. Validate unit tests, TypeScript, ESLint, production build, browser desktop/mobile and gameplay. Commands: `mkdir -p docs src/game src/data src/components src/hooks tests scripts public`; web source discovery for Armenian dictionary provenance. Outcome: structure and plan established.

## Step 3: scaffold and source discovery

Commands: `npm install react react-dom lucide-react @fontsource/noto-sans-armenian`, development dependency installation (TypeScript, Vite, Vitest, ESLint, Playwright, axe), `curl -fsSL` GitHub API and raw dictionary/license endpoints. Created package/config/HTML/favicon/gitignore files. Selected martakert/hyspell, CC0 license; preserved source and license under data/source. No generated inflections will be invented. Curated answers will be checked against dictionary headwords. Dependencies installing; source downloads succeeded.

## Step 4: tests, dictionary processing, game engine

Commands: `npm test` (expected initial failure: missing engine module), `node scripts/build-dictionary.mjs`, Python curation against accepted headwords, `node scripts/check-dictionary.mjs`. Imported 65,002 lowercase Armenian headwords; curated 423 unique attested answers across four levels. Rejected seven candidate answers missing from the source. Created types, normalization/tokenization, two-pass duplicate scoring, keyboard merge, filtering, random/history selection, completion, stats and deep storage guards. Initial GitHub `commits/master` request failed HTTP 422; recovered with `commits?per_page=1`, pinned revision 552ec8ea46af3113b39bf4f7191e64f6675c7863. Raw dictionary/license downloads succeeded. No source contents or definitions fabricated.

## Step 5: working interface and state integration

Created useGame state hook, Board, Keyboard, SettingsPanel, native dialog Modal, Help, Statistics, App, main and responsive styles. Features: local persisted preferences/stats/history/theme, guarded new game, full Armenian keys, real input and physical key handlers, duplicate-aware tile/key symbols, difficulty/custom candidate counts, hint, win/loss/replay/reset dialogs, focus trapping, reduced motion and long-word fitting. Commands: file creation via quoted shell heredocs. Outcome: complete implementation ready for build and browser checks. Engine verification: 43 tests passed.

## Step 6: initial integration checks and browser connection

Commands: `npm run build && npm run lint`, `nl -ba src/App.tsx | sed -n '32,39p'`. Build identified a missing JSX closing brace in input onKeyDown (App line 36); fixed the exact syntax issue and reran checks. Read systematic-debugging and verification-before-completion skills. Browser plugin initialization failed because its trusted worker imports missing `/home/samo/.codex/plugins/cache/openai-bundled/browser/26.818.61809/scripts/browser-service.mjs`; current listed plugin path is 26.908.40834. Using local Playwright Chromium for user-requested visual and flow checks. Command: `npm exec playwright -- install chromium`.

## Step 7: browser regression suite and diagnostic fixes

Created Playwright configuration and nine browser tests covering invalid input/no attempt consumption, victory/replay/stats/reset, defeat, physical/on-screen input, unavailable custom pools, restart confirmation, dialog focus, theme persistence/corrupt storage, hint and desktop/mobile/long-word accessibility. Commands: `npm run test:e2e`, `npm run build && npm run lint`. Build succeeded after adding Vite CSS declarations; lint initially reported two shared-constant Fast Refresh warnings, resolved by extracting game/presentation.ts. First E2E discovery failed due to Node 24 JSON import attributes; changed test fixture loading to explicit fs JSON parsing. Created dictionary methodology/provenance documentation. Build warns about bundled dictionary size (325 KB gzip total); reviewing loading strategy.

## Step 8: accessibility fixes and verified browser flow

First E2E pass: four passed, five failed. Investigated traces/snapshots: broad tile selector included hidden help tile; Playwright cannot synthesize an Armenian OS layout with keyboard.press; label lookup required combobox role. Corrected fixtures/selectors without changing app behavior. Real defects fixed: muted contrast, missing roles on named tile/group elements, native-dialog tab escape (explicit first/last wrap), and temporary low contrast during theme background transitions. Replaced transition with transform-only and kept letters lowercase to preserve Armenian և spelling. All nine browser tests now pass, including light/dark axe audit and 320/390/650/768-width long-board fit. Screenshots saved to docs/screenshots and desktop inspected.

## Step 9: dictionary startup loading

A large JS bundle warning came from embedding the full accepted-word JSON as executable code. Moving it to a hashed local asset fetched and validated before mounting the game; added loading/error/retry screens. Added strict malformed-dictionary test (initial generic throw assertion was falsely passing because function was absent; tightened to expected error message and observed failure before implementation). Added browser retry regression. Commands: `npm test`, file updates, `npm install -D prettier`. Formatting tool installed for readable component/module source. No external runtime dictionary service required.

## Step 10: visual inspection, long-word polish and documentation

Inspected desktop, dark, mobile and mobile-long PNGs using view_image. Found custom tab label cramped and long tiles too short for separate status symbols; added a short mobile label and 32px tall long-word tiles with symbols below letters. Fixed visually hidden skip-link clipping for full-page screenshots. Expanded source-verified answers with ten real 20–21 letter terms and short original definitions; now 433 answers, 49 expert, nine 20-letter and two 21-letter answers. Footer derives count from data. Updated dictionary methodology and README. Used Prettier to format all source, configs and tests. Commands: `node scripts/check-dictionary.mjs`, `npm exec prettier -- --write ...`, `npm run lint && npm run build && npm test`. Results: lint clean, 44 unit tests pass, build warning eliminated (JS ~290 KB, dictionary separate ~1.39 MB / 240 KB gzip).

## Step 11: loading regression and production check preparation

Ten browser tests pass after the startup asset change. Updated test setup to await visible ready input before reading selected-word fixture; network-failure route now aborts only fetch (not Vite's URL module import). Added a 1150ms result-dialog delay so the final row can reveal, disabled delay under reduced motion. Added production-preview mode to Playwright configuration, Node version requirement and format commands. README includes exact launch/build/test commands, architecture, dictionary method and honest limitations. Source snapshot verification command: curl the pinned GitHub revision and compare sha256sum with preserved dictionary.

## 2026-09-13 — Step 12: Battle scope and current repository audit
User expanded scope to multiplayer Battle rooms across devices, 2–8 participants, synchronized level progression, timed scoring, optional registration, history, and installable app support. Audited current source with `rg --files`, `cat package.json`, i18n provider/index and Vite config. Existing app is Vite-only with no server, auth, database or PWA manifest. Decision: add a self-contained Node WebSocket/SQLite service and a client Battle mode while preserving solo Wordle. Guest sessions work without signup; registered accounts persist history. Battle protocol will use server-authoritative rooms and deterministic round seeds so every device receives identical answer words. PWA uses manifest/service worker for installability and offline shell; multiplayer requires network connection.

## 2026-09-13 — Step 13: Battle protocol foundation
Added `server/index.mjs` and `server/README.md`: WebSocket room service with guest/register/login flows, atomic JSON account persistence, 2–8 player lobby, host start, four level rounds, deterministic server-selected answer, deadlines, speed/wrong-answer scoring, disconnect state and room cleanup. Added `src/game/battle.ts` and unit tests for ordered levels, seed determinism, normalization and scoring. Server validates submitted guesses against its private answer; clients do not receive the secret.

## 2026-09-13 — Step 14: Battle client and installable shell
Created `src/components/BattlePanel.tsx` with live WebSocket connection, guest name, room creation/joining, 2–8 participant selection, lobby presence, host start, four synchronized rounds, countdown, speed scoring, opponent scoreboard and offline guidance. Added `src/game/battle.test.ts`. Added `public/manifest.webmanifest` and `public/sw.js`, linked manifest and production service worker registration for installable PWA shell. Added battle styles and translated Battle copy in Armenian, English and Russian. Initial server allows guest identity and exposes registration protocol; client lobby remains guest-first to keep friction low.

## Step 15 — Final i18n and Battle smoke validation (2026-09-13)
- Converted Help and Statistics visible copy to translation keys for Armenian, English, and Russian; preserved Armenian example letters because the game content is Armenian by design.
- Reworked `scripts/test-battle.mjs` to attach WebSocket listeners before handshake events, preventing message races; verified two guest clients can create and join a room.
- Added explicit Battle host socket tracking on the server and constrained responsive overflow on the app root/workspace.
- Commands: `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run dictionary:check`, `npm run build`, `npm run test:battle`.
- Result: typecheck/lint/build passed, 55 unit tests passed, dictionary check reported 65,002 accepted and 433 curated answers, Battle smoke test passed. One long-board Playwright width test still reports horizontal overflow after dynamic 20-letter interaction and remains under investigation.

## Step 16 — Documentation and final smoke checks (2026-09-13)
- Documented Battle server startup, WebSocket configuration, account persistence, deployment expectations, and PWA installation in README.
- Verified `npm run typecheck` and `npm run test:battle` after documentation and responsive CSS changes.

## Step 17 — Production deployment (2026-09-13)
- Pushed repository to GitHub `Samvel10/worldgame` on branch `main`.
- Deployed to `/opt/worldgame` on `5.223.92.226`, built with Node 22, and configured `worldgame-battle.service` under systemd.
- Existing Apache service occupied ports 80/443 and existing local services occupied 8787/8788; integrated with Apache reverse proxy on internal port 8799 instead of disrupting other hosted projects.
- Configured `armworldgame.duckdns.org` Apache vhost, WSS proxy at `/ws`, TLS certificate via Certbot, HTTP→HTTPS redirect, and static PWA files.
- Verified HTTPS returns 200, manifest is served, and WSS handshake returns the Battle protocol hello message.

## Step 18 — Registration flow redesign (2026-09-13)
- Replaced the cramped inline Battle login/register controls with a focused account entry screen: account welcome state, dedicated login and registration forms, guest continuation, password/username validation, accessible error alerts, and clear back navigation.
- Added complete Armenian/English/Russian translations for the new account flow.

## Step 19 — Account onboarding polish verification (2026-09-13)
- Added responsive styles for account cards, forms, focus states, validation alerts, guest continuation, and lobby options.
- Verified typecheck, lint, 55 unit tests, production build, GitHub push, server sync, and active systemd restart.

## Step 20 — Battle session/start bug fix (2026-09-13)
- Fixed the post-login loop by introducing an authenticated session state and a guest-ready state; the account screen no longer reappears after successful login/registration.
- Fixed create/join flow to reuse the active session and only send guest identity when needed; restored the missing create button closing tag and verified host start path.
- Re-ran typecheck, lint, 55 unit tests, production build, GitHub push, server sync, and systemd restart successfully.

## Step 21 — Global audit and graph mapping (2026-09-13)
- Ran the graphify code-map update for the project: 217 nodes and 470 edges extracted across client/server modules.
- Audited the Battle lifecycle and identified the root causes of the reported behavior: the UI reset authenticated sessions to the welcome state, and create/join sent guest identity opportunistically instead of respecting the active session.
- Confirmed the deployed service remains active and live HTTPS serves the production bundle.

## Step 22 — Refresh/cache reliability fix (2026-09-13)
- Identified the refresh slowdown/stale behavior source: the PWA service worker used cache-first for the HTML and versioned assets, so users could receive obsolete bundles after deployment.
- Bumped the cache version, added old-cache cleanup, and switched navigation/JS/CSS requests to network-first with offline fallback.
- Redeployed the production bundle and restarted Battle service.

## Fresh audit
Source tracing identified guest player lookup, socket-only accounts, hidden-modal connections, missing Battle validation/attempts, and uncancelled round timers. Prior lobby-only smoke checks did not verify a playable game. See docs/AUDIT.md. No performance root cause has yet been measured.

## Audit verification and deployment design
- Replaced the lobby-only smoke with four-round two-client start/validation/finish coverage; it failed against the original server and passes with socket-based player identity.
- Added site-level account pages, persisted HttpOnly cookie sessions, logout and history; removed authentication forms and hidden socket from the Battle modal.
- Implemented server-only answers/marks, enforced dictionary/length/attempt validation, phase guards and cancellable room timers. Added public-room matchmaking and disconnect cleanup.
- Added production-browser tests: two registered users complete four rounds, profiles survive refresh, language switches keep rooms, route cycles release sockets, API is never cached, and offline solo loads.
- Added equivalent translation key tests and fixed remaining visible and accessible UI labels. Account screenshots were inspected at desktop/mobile sizes.
- Production preview audit: 5 browser tests passed; six reloads took 291/174/163/153/161/150 ms. Existing solo suite: 11 passed, including the 20-letter mobile scenario.
- Remote read-only inspection: old Battle service had ~15 MB memory, zero restarts, and its server/data directory was empty. No claim is made that prior account data can be recovered. New deployments will protect an external persistent directory and retain releases/backups.

## Release preparation
- Added scoped activation script with application-specific backup, rollback on error, unprivileged service user, loopback listener, and persistent /var/lib/worldgame storage.
- Replaced stale deployment instructions and README with current account/Battle rules, screenshots, test commands and explicit operating limits.
- Added tests for three-player public matchmaking, attempt exhaustion, restart-compatible sessions, wrong/correct UI login, and legacy service-worker migration.
- Checked account and Battle desktop/mobile screenshots directly. Fixed shared theme state, translated board labels, and preserved physical keyboard support beyond input focus.

## 2026-09-13T19:45:17.518321+00:00 — Scoped production activation and live verification
- Packaged built dist/server/dictionary and production manifests, excluding server/data; uploaded to `/opt/worldgame/releases/3054c5d-20260913`. Ran `scripts/deploy/activate.sh` remotely. This preserves prior releases and external accounts rather than deleting the deployment directory. Apache configuration validated and only this domain was reloaded.
- Used `ssh -i ~/.ssh/hetzner_key root@5.223.92.226` to inspect `systemctl show worldgame-battle -p User -p ActiveState -p NRestarts -p MemoryCurrent`, `readlink /opt/worldgame/current`, `stat` on `/var/lib/worldgame`, and loopback health. Results: worldgame user, active, zero restarts, 77897728 bytes memory, correct release, protected persistent directory, zero rooms/connections after browser closure. HTTPS `/version.json` confirms 3054c5d.
- Ran `node scripts/verify-live.mjs`: two real HTTPS browser accounts completed registration, refresh, four shared rounds, history, logout and login. Passed, zero page errors; timing observations recorded without an unsupported performance guarantee.
- Inspected desktop 1440px and mobile 390px live profile screenshots directly. No clipping or overflow observed. Formatted the reusable live verifier with `npx prettier --write scripts/verify-live.mjs`; ran lint and the complete production-preview audit suite for final regression verification. Results are recorded in the following entry.

## 2026-09-13T19:45:40.923878+00:00 — Final regression results and evidence publication
- `AUDIT_PREVIEW=1 npm run test:audit`: all 6 tests passed in 24.6 seconds, including real four-round accounts flow, guest start, trilingual/accessibility checks, resource cleanup, offline/API cache isolation, and legacy cache upgrade.
- `npm run lint`: exit 0 after formatting the live verifier. Earlier typecheck, production build, 56 unit tests, 11 solo browser tests, dictionary check (65002 accepted/433 answers), and Battle integration suite passed.
- Publishing the live verification script, JSON evidence, screenshots and updated audit to the authorized GitHub main branch. Runtime release remains 3054c5d because these additions only document and verify it.

## 2026-09-13T20:11:27.070895+00:00 — Physical Enter investigation
- Read Armenian/systematic-debugging/TDD guidance; traced App input/form/global key handling, useGame submission and Battle keyboard handling.
- `git status --short` revealed existing uncommitted edits to eight UI files, including account routing changes unrelated to this report. Preserved them. `git worktree add -b fix/physical-enter /tmp/worldgame-physical-enter HEAD` isolates the fix against the deployed source. Shared installed dependencies via symlink.
- Added browser reproductions using actual Armenian key events for six-tile words with input, body, letter-button and check-button focus; running `npx playwright test -g "physical Armenian input"` before implementation.

## 2026-09-13T20:13:24.465343+00:00 — Enter root cause and regression fix
- Initial Playwright `keyboard.press` cannot dispatch Armenian keys; this was a test-harness failure, not product evidence. Replaced it with Chromium CDP keyDown/keyUp carrying Armenian key/text. Used isolated port 5193 because the normal development port may serve unrelated workspace edits. Shared dependency symlinks triggered Vite font allow-list warnings; final checks use the production build/preview with bundled fonts. Temporary port change was reverted.
- Before fix: input/body/check focus passed; virtual-letter focus failed with the exact six-letter validation error and no submitted guess. Native Enter reactivated the focused virtual letter because global handling deliberately preserves button activation.
- Fix: when a physical letter or Backspace is handled outside an input, focus the game input before applying that edit. Enter then follows the same form submission as the submit button. Applied to both solo and Battle; preserved Tab/Enter/Space activation of virtual keys before typing.
- `npm run build` passed TypeScript and production bundling. `npm run lint` and 56 unit tests passed. `PLAYWRIGHT_PREVIEW=1 npm run test:e2e`: all 16 passed, including four physical-input focus scenarios, native button accessibility, mobile/desktop layout and axe checks. Battle audit now types each round through physical key events and Enter in both browsers.

## 2026-09-13T20:15:03.983621+00:00 — Physical Enter production verification
- All 6 production-preview audit tests passed, including physical Armenian typing and Enter through four Battle rounds for both browsers.
- Applied only the reviewed 5-line source fix and regression tests to the main working tree/index using `git apply --cached` and `git apply`; existing unrelated UI edits remain unstaged and were not published. Pushed runtime commit `9f600b9` to GitHub main.
- Built artifact from isolated verified source, added revision metadata, uploaded `/tmp/worldgame-enter-9f600b9.tgz`, extracted `/opt/worldgame/releases/9f600b9-20260914`, reused identical production dependencies, atomically switched `/opt/worldgame/current`. No server restart or data writes: health showed one active room with two connected players, so this client-only release preserved their running server. Previous release retained for rollback.
- HTTPS `/version.json` reports 9f600b9. Used a temporary Playwright configuration targeting live HTTPS and ran `npx playwright test --config playwright.live.config.ts -g "physical Armenian input|Tab-focused virtual"`: all 5 passed in 33.1 seconds. Six-letter words submit with Enter from all four initial focus positions; native virtual-key Enter/Space accessibility also passed.
- Remote service remains active with zero restarts. Runtime source is 9f600b9; this final log adds only test evidence.

## 2026-09-14T03:32:46.899796+00:00 — Host-controlled Battle timing
- Read server round lifecycle, ranking, client timers and layout; inspected a live desktop screenshot. Connection badge stretched vertically because flex alignment defaulted to stretch.
- Design: host integer seconds 0–3600; zero means no deadline, shared by all rounds. Server records per-player active elapsed time, freezes it on solve/attempt exhaustion/timeout, excludes intermissions. Ranking is solved count descending, total time ascending, then points. UI shows live totals above the board and persisted totals in account history, with all three translations.
- Created isolated worktree because main has unrelated uncommitted UI changes. Initial unit test failed for missing shared rules; implemented rules and both server/client handling. Build and old integration passed before interruption, but the test suite was still running.
- Environment restarted on user continuation; `/tmp` worktree and running tests were gone. Restored changes in persistent `/home/samo/Documents/ChatGPT/worldgame-battle-time`; rerunning all required checks. No deployment has occurred for this feature yet.

## 2026-09-14T03:38:25.374482+00:00 — Timing verification and visual review
- `npm run test:battle` now tests invalid host duration, exact 1-second deadline, timeout elapsed clamp, four unlimited rounds, frozen completed-player totals, cumulative totals, and room cleanup. Passed after correcting a test predicate that accidentally consumed a previous-round snapshot (1104 vs 1102 ms was stale test input, not duplicate accounting).
- `npm test`: 60 tests passed. `npm run lint` and `npm run build` passed. `PLAYWRIGHT_PREVIEW=1 npm run test:e2e`: all 16 passed.
- First audit run found the duration input accessible name included its helper text; added an explicit translated aria-label and kept aria-describedby. `AUDIT_PREVIEW=1 npm run test:audit`: all 7 tests passed, including unlimited account history, selected 17-second peer setting, read-only guest controls, live/frozen counters and 320/390px overflow checks.
- Viewed lobby, active desktop and mobile screenshots directly. Corrected remaining mobile status wrapping by anchoring the compact indicator to the header corner. Production build and audit rerun verify this final CSS adjustment.
- Updated README/architecture with new ranking, time semantics and shared runtime deployment directory. Preparing scoped GitHub commit and live deployment; original main UI edits remain excluded.

## 2026-09-14T03:41:59.661775+00:00 — Live timing release verified
- Published source commit 58a064b to GitHub main, excluding pre-existing unrelated UI edits. Uploaded a verified build with shared/server/dictionary runtime into `/opt/worldgame/releases/58a064b-20260914`. Confirmed zero live rooms/connections before activating with `ssh ... bash -s -- 58a064b-20260914 < scripts/deploy/activate.sh`; scoped backup, Apache syntax and service checks passed.
- HTTPS `/version.json` confirms 58a064b. `node scripts/verify-timing-live.mjs` completed all four rounds on two independent registered browsers with host-selected zero/unlimited deadlines. Final server totals: 5519 ms and 7233 ms. Account history after logout/login showed the faster player first despite fewer points, confirming time priority. Zero page errors. Observations stored in docs/LIVE_TIMING_VERIFICATION.json.
- Independent live WSS check created a two-player room with roundSeconds=2. Both received an exact 2000 ms deadline; after expiration both server totals were exactly 2000 ms. Closed test clients afterward.
- Viewed desktop/mobile live history screenshots and final mobile status layout. Service active with zero restarts, zero rooms and zero connections after tests. Final lint passed after making the live verifier wait for the final room snapshot.

## 2026-09-14T04:00:51.357816+00:00 — Partial scoring and duplicate-credit protection
- User requested green/yellow discovery credit with a smaller wrong-guess penalty, then explicitly confirmed that the same word must be rejected and already paid green positions must not earn twice in different guesses.
- Isolated worktree at `/home/samo/Documents/ChatGPT/worldgame-partial-score` preserves unrelated dirty main UI files. Added five regression tests first; all five failed against missing scoring and time-first ranking. Implemented per-round discovery ledger, +100 green/+40 yellow/+60 upgrade, −5 valid wrong guess, +1000 solve bonus; duplicate validation remains before any mutation.
- Ranking now compares solved count, points, then time, so zero-solve matches reward partial progress. Exact ties are not artificially assigned winners. Added translated per-guess score feedback and rules; updated architecture and README.
- `npm test` passed 65 tests; TypeScript/build and lint passed. Added real server and browser tests for two existing green positions across different words, uppercase duplicate rejection without spending an attempt, and completed four-round zero-solve results. Running integration and browser audit next.

## 2026-09-14T04:02:01.143712+00:00 — Partial-score regression results
- `npm run test:battle` passed: two correct initial positions produce 195 points, uppercase repeat is rejected, a different word repeating those greens changes score by −5 only, another player discovers two yellows for 75, and four unsolved rounds retain 190/75 scores.
- `AUDIT_PREVIEW=1 npm run test:audit`: all 8 passed, including browser duplicate attempt counting, per-guess delta, zero-solve winner shown to both browsers, timing/translation/account regressions. Inspected docs/screenshots/battle-partial-score.png directly. Final lint passed.
- Remote health currently shows one room/two connections. Preparing the release while preserving their active game; activation will wait for an empty room set.

## 2026-09-14T04:06:51.966413+00:00 — Safe activation of partial-scoring release
- Staged `/opt/worldgame/releases/641803b-20260914` with dist/server/shared/dictionary and production manifests. Remote health remained at one room/two connections, which does not distinguish playing from finished.
- Performed scoped read-only runtime diagnostics on the exact worldgame MainPID 3261055: verified local inspector port 9229 was unused, temporarily enabled inspector via SIGUSR1, verified process PID, and inspected only room phase/participant counts. First query returned undefined due to including Map.prototype; repeated with invalid-map receivers skipped. Result: one `finished` room with two participants. No answers, credentials or player names were read/output. Closed inspector immediately; port is no longer listening.
- Because no game was in progress, activated 641803b via scoped deployment script. Application-specific backup, Apache syntax and service checks passed. HTTPS version.json confirms release; service active, zero automatic restarts. Running independent live browser test for duplicate rejection and positive partial score after a full zero-solve match.

## 2026-09-16T19:26:38.442960+00:00 — Complete Armenian on-screen keyboard
- User reported missing խ. Inspected shared Keyboard.tsx, used a persistent isolated worktree to preserve unrelated main UI edits. Added a browser test enumerating all 38 Armenian alphabet characters plus ու/և keys exactly once, typing/deleting խ at widths 320, 390 and 1440, and verifying no horizontal overflow.
- Before fix, browser test failed: 39 keys instead of required 40. Added խ to the previously 9-key final row, keeping four balanced 10-key rows. The component is shared by solo and Battle, so both receive the key. Built production bundle and running full solo browser suite plus lint.
