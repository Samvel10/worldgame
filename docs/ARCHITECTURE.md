# Runtime map

This map follows source code, not previous completion claims. The graphify AST export is in `graphify-out/graph.json`; AST relationships alone do not prove runtime correctness.

```mermaid
flowchart TD
  Site[Site: route and account state] --> Solo[App: local solo game]
  Site --> Account[AccountPage: register/login/profile]
  Site --> Battle[BattlePanel: one socket while on Battle page]
  Account --> API[HTTP /api/session, register, login, logout, history]
  API --> Store[accounts.mjs: async password hashing and hashed session tokens]
  Store --> Disk[/var/lib/worldgame/accounts.json]
  Battle --> WS[WebSocket /ws]
  WS --> Session[Read HttpOnly account cookie or guest identity]
  Session --> Rooms[One active room per socket]
  Rooms --> Match[Four host-configured rounds]
  Match --> Validate[Dictionary, length, attempts, repeated guess checks]
  Validate --> Marks[Two-pass duplicate-letter evaluation]
  Marks --> Private[Marks sent only to guessing player]
  Match --> Scores[Public score and connection status]
  Match --> Disk
  Rooms --> Cleanup[Leave/close cancels abandoned timers]
  Site --> I18n[Armenian / English / Russian]
  SW[Service worker] --> Public[Bounded public asset cache]
  SW -. never cache .-> API
```

## Deployment

Apache serves `/opt/worldgame/current/dist` and proxies `/api/` plus `/ws` to the dedicated service on **127.0.0.1:8799**. Account data is outside releases in `/var/lib/worldgame`. Systemd runs an unprivileged `worldgame` user. Deployment keeps the preceding release and a timestamped backup; no broad `rsync --delete` is used against live data.

## Remaining operating boundaries

- One Node process and atomic JSON persistence; this is not a multi-node database deployment.
- Rooms support 2–8 players. Public matchmaking joins a waiting room; its host starts when ready.
- Reconnecting after a lost Battle connection returns to the lobby. Unfinished matches are not restored after process restart. Account sessions and completed history do survive restart.
- Solo statistics are local to the device; Battle history belongs to the account.

## Battle timing

Host `roundSeconds` accepts integers 0–3600 (default 90); zero creates no deadline or timeout. Public matchmaking only matches identical durations. `shared/battle-rules.mjs` defines validation, elapsed time and shared ranking. The server settles elapsed time once per player/round on solve, attempts exhausted, disconnect, or deadline; intermission and waiting after completion are excluded. Ranking compares solved count, then points, then accumulated milliseconds. Live time above the board uses server clock offset; final time and rank come from the server and are persisted in history.

Deployment archives must include `shared/` alongside `server/`, `src/data/`, `dist/` and production package manifests.

## Partial-discovery scoring

`scoreGuess` retains a per-round set of green positions and maximum confirmed occurrence count per Armenian letter. Each new green position is worth 100; confirmed occurrences beyond green positions are worth 40 each. Only the increase in discovery credit is awarded, so moving a yellow or reusing greens cannot farm points. Yellow-to-green pays the remaining 60. Every valid unsolved guess costs 5; a solved word adds 1000. Server clamps the running match score at zero. Duplicate normalized words and invalid guesses are rejected before scoring or spending an attempt. Discovery state resets each round; match points persist. Ranking keeps solved count first, then points, then total elapsed time; exact ties remain ties.
