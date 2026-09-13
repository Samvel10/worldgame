# Barrik Battle service

`node server/index.mjs` starts the WebSocket Battle service on port `8787` (override with `PORT`). It supports guest sessions, scrypt-hashed optional accounts, 2–8 player rooms, host-controlled starts, four synchronized rounds, server deadlines and server-side scoring. Account data is stored atomically in `server/data/accounts.json`; set `BARRIK_DATA_DIR` for a persistent volume in production.

The browser connects to `VITE_BATTLE_URL` (default `ws://localhost:8787`). Put the service behind TLS (`wss://`) and a reverse proxy for public deployment. The current service intentionally has no external provider dependency; rate limiting, durable SQL storage, refresh tokens and horizontal room coordination should be added before operating at internet scale.
