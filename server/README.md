# Battle service

Run from the repository root with `npm run battle`. Node >=22.12. Default bind: **127.0.0.1:8787**.

Environment:

- `PORT`, `HOST`: listener (keep loopback behind reverse proxy).
- `BARRIK_DATA_DIR`: persistent directory; production uses `/var/lib/worldgame` outside release files.
- `TRUST_PROXY=1`: only behind the local Apache configuration that overwrites `X-Real-IP` and `X-Forwarded-Proto`.
- `NODE_ENV=test`: deterministic answers and shorter rounds for integration tests only. Never set in production.

HTTP routes: GET `/api/session`, `/api/history`; POST `/api/register`, `/api/login`, `/api/logout`. Same-origin requests; HttpOnly, SameSite cookie, Secure under HTTPS; opaque tokens are stored hashed. Scrypt runs asynchronously. Account history remains compatible with the earlier password-hash file format.

WebSocket `/ws` sends `hello` and `session`, then handles `guest`, `create_room`, `join_room`, `quick_match`, `leave_room`, `start_battle`, and `submit_guess`. Player identity is socket identity, never a client-supplied account ID. Answers remain server-side. Only valid, correctly sized words use an attempt. All room timers are cancelled when a room empties; heartbeat detects abandoned sockets.

One process and atomic JSON persistence. Do not run multiple processes against one JSON file. Current rooms are not restored across disconnect/process restart; completed account histories and sessions are durable. Before horizontal scaling, migrate to a transactional database and shared room coordination.
