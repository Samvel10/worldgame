# Verified audit — 2026-09-13

Previous completion claims are not accepted as test evidence.

## Confirmed by source tracing

- Guest start silently returns: player lookup uses ws.user, absent for guests.
- Account only exists on one socket; no durable browser session, account page or logout.
- Modal renders Battle even when closed, opening a hidden socket.
- Translation callback identity can recreate the socket when provider renders.
- Server exposes answer seed; client resolves secret. Battle has no scored board, dictionary validation or enforced attempts.
- Start has no phase guard; repeated starts can leave old timers.
- Between-round timeout is not retained or cancelled on empty-room cleanup.
- Prior smoke test verifies lobby only, not start or completion.
- Deployment rsync --delete did not protect server/data; future deployment must protect persistent data.
- Cache-first HTML can serve old builds; slowdown cause still needs measurement, not assertion.

## Implementation and verification sequence

1. Reproduce guest start with integration test.
2. Separate durable HTTP cookie account sessions from room sockets; add full account routes in main navigation.
3. Authoritative server board evaluation and bounded round lifecycle.
4. Independent browser sessions: register, refresh, join, start, guess, finish, logout.
5. Translation parity, dialogs, responsive layout and repeated navigation/resource measurements.
6. Backup remote data, deploy only scoped application files, verify live.

## Implemented repairs and evidence

| Finding | Repair | Verification |
|---|---|---|
| Guest start returned silently | Match player by socket ID, explicit host/phase checks | Real two-guest four-round integration and two-browser start |
| Login state tied to modal/socket | Main account routes and persistent HttpOnly cookie | Register → refresh → Battle → history → logout → wrong/correct login |
| Hidden sockets and lost room on language switch | Battle mounts only on its route; socket lifetime independent of translations | Zero connections on home, language switch retains room, repeated routes release all sockets |
| Client-derived answer | Server-only selection and two-pass evaluation | No answer/seed in round-start payload; both clients receive identical deadlines and rounds |
| No dictionary/attempt enforcement | Server validation and player completion after configured attempts | Invalid/duplicate guesses rejected; seven wrong easy guesses end the turn |
| Untracked round timers | One stored room timer; cleanup on empty room | Three-player room abandoned between rounds remains removed |
| Missing account history | Record completed match by account ID | Browser profile and re-login history check |
| Cache serving stale/private responses | Versioned bounded public cache; API excluded; one-time legacy migration | Production offline and API-cache checks; legacy migration test |
| Broad deployment risks | Release directory, external persistent storage, scoped backup and rollback | Deployment script syntax checked; live activation pending |

No claim is made about unlimited capacity or complete reconnect recovery. Operating boundaries are documented in ARCHITECTURE.md.
