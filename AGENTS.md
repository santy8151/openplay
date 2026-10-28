# AGENTS.md — OpenPlay

## Misión
Plataforma open source (Apache-2.0) y federada para jugar juegos casuales/arcade en navegador (PWA iOS Safari / Android Chrome), con multijugador P2P y modding opt-in. BETA.

## Reglas duras (no negociables)
- Solo juegos propios, open source (SPDX declarado) o con permiso del autor.
- PROHIBIDO implementar: parcheo de juegos de terceros, bypass de licencias o compras, inyección binaria, redistribución de APK/IPA de terceros.
- Si una tarea lo requiere, detente y repórtalo en vez de implementarlo.

## Stack (versiones fijas)
- Node 22 LTS+, pnpm 9, TypeScript 5.6 strict, Vite 6, Vitest, Playwright
- Preact + TypeScript + Workbox (PWA), CSS con variables nativas (sistema de diseño Cyberpunk)
- Go 1.23, chi v5, pgx v5, sqlc, goose (migraciones), Postgres 16, Redis 7
- Rust stable + target `wasm32-unknown-unknown`, cargo workspace
- coturn (TURN con credenciales efímeras REST/HMAC)
- Docker Compose para levantar un nodo completo
- CI: GitHub Actions (lint, test, build, e2e)

## Layout
```
/apps/client        PWA (Vite + Preact + TS + Workbox + Cyberpunk UI)
/apps/node          API del nodo + señalización (Go)
/packages/abi       tipos TS del host ABI + loader Wasm + compilador Wasm binario para juegos embebidos
/packages/manifest  JSON Schema + validador + firma/verificación JCS + Ed25519 (TS y Go)
/packages/mods      sandbox Lua (intérprete seguro / Web Worker con watchdog de 2ms)
/packages/lab       simulador de red (latencia/jitter/pérdida), métricas, hash de snapshot y replay determinista
/crates/game-sdk    SDK Rust para autores de juegos (ABI v0)
/games/pong         demo single/2P (Rust + Wasm ABI v0)
/games/arena        demo multijugador P2P 2-4 jugadores (Rust + Wasm ABI v0)
/games/cyber-runner demo arcade adicional open source (Wasm ABI v0)
/deploy             docker-compose.yml, coturn.conf, Caddyfile
/docs               arquitectura, ADRs, threat-model.md, guías de nodo y autoría
```

## Comandos canónicos
- `npm test` / `pnpm -r build && pnpm -r test`
- `cd apps/node && go test ./... && go vet ./...`
- `cargo test --workspace && cargo build -p pong --target wasm32-unknown-unknown --release`
- `npm run e2e` / `pnpm e2e`
- `docker compose -f deploy/docker-compose.yml up --build`

## Contratos (fuente de verdad)

### Manifest del juego (`manifest.json`, JSON Schema 2020-12)
```json
{
  "schema": 1,
  "id": "dev.openplay.pong",
  "name": "CyberPong 2099",
  "version": "1.0.0",
  "license": "MIT",
  "author": { "name": "OpenPlay Core", "pubkey": "ed25519:<base64>" },
  "abi": "host-abi/0",
  "entry": "game.wasm",
  "display": { "width": 480, "height": 320, "scale": "fit" },
  "permissions": ["audio", "storage", "net.p2p"],
  "multiplayer": { "mode": "p2p-lockstep", "min": 1, "max": 2, "tickrate": 60 },
  "mods": { "enabled": true, "lang": "lua", "hooks": ["on_init", "on_tick", "on_event"] },
  "files": [{ "path": "game.wasm", "sha256": "<hex>", "size": 12345 }],
  "signature": "<base64>"
}
```
Firma: Ed25519 sobre `sha256(JCS(manifest sin el campo signature))` (JCS = RFC 8785).

### Índice federado (`index.json`, firmado por el nodo)
```json
{
  "schema": 1,
  "node": { "name": "Neo-Bogota Node 01", "url": "https://node.openplay.example", "pubkey": "ed25519:..." },
  "updated": "2026-10-27T23:00:00Z",
  "games": [
    {
      "id": "dev.openplay.pong",
      "version": "1.0.0",
      "manifest_url": "https://node.openplay.example/v1/games/dev.openplay.pong/manifest.json",
      "package_url": "https://node.openplay.example/v1/games/dev.openplay.pong/package.zip",
      "package_sha256": "...",
      "license": "MIT",
      "tags": ["arcade", "retro", "p2p", "mods"]
    }
  ],
  "peers": ["https://tokyo-grid.openplay.example"],
  "signature": "..."
}
```

### Host ABI v0 (módulo core Wasm)
El juego EXPORTA:
- `memory`
- `game_alloc(len: u32) -> u32`
- `game_init(seed: u32, w: u32, h: u32)`
- `game_tick(dt_us: u32)` — paso FIJO (`1_000_000 / tickrate`), determinista
- `game_input(kind: u32, a: i32, b: i32, c: i32)`
- `game_net_recv(peer: u32, ptr: u32, len: u32)`
- `game_framebuffer() -> u32` — puntero RGBA8 `w * h * 4`
- `game_snapshot(ptr: u32, cap: u32) -> u32` y `game_restore(ptr: u32, len: u32)`
- `game_mod_event(ptr: u32, len: u32)` — eventos de mods (opcional)

El host IMPORTA al módulo `"host"`:
- `log(ptr: u32, len: u32)`
- `audio_play(id: u32, vol_q8: u32)`
- `storage_get(kptr: u32, klen: u32, vptr: u32, vcap: u32) -> i32`
- `storage_set(kptr: u32, klen: u32, vptr: u32, vlen: u32) -> i32`
- `net_send(peer: u32, channel: u32, ptr: u32, len: u32) -> i32` (`0`=fiable, `1`=no fiable)
- `mod_emit(ptr: u32, len: u32)`

Regla de determinismo: la simulación NO puede usar reloj ni RNG del host; solo `seed` y los inputs.
