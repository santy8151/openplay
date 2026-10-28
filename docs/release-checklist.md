# Lista de Verificación de Lanzamiento (Beta Release Checklist) — OpenPlay

Esta lista valida que todos los subsistemas de **OpenPlay BETA** cumplen las especificaciones de seguridad, determinismo, federación y experiencia móvil antes de publicar un corte de versión.

## 1. Integridad Criptográfica y Licenciamiento
- [x] Esquema JSON 2020-12 valida todos los campos obligatorios de `manifest.json` (`schema: 1`, `abi: "host-abi/0"`, `license`, `author.pubkey`, `files[]`, `signature`).
- [x] Canonización **RFC 8785 (JCS)** produce bytes idénticos en TypeScript (`@openplay/manifest`) y Go (`apps/node/internal/manifest`).
- [x] Firma **Ed25519** sobre `sha256(JCS(manifest_sin_signature))` rechaza cualquier alteración de 1 bit en el manifiesto o en el índice federado `/v1/index.json`.
- [x] Lista blanca **SPDX** bloquea licencias propietarias o no declaradas; límite duro de **20 MiB** por paquete aplicado.

## 2. Host ABI v0 y Determinismo WebAssembly
- [x] Todos los juegos exportan `memory`, `game_alloc`, `game_init`, `game_tick`, `game_input`, `game_net_recv`, `game_framebuffer`, `game_snapshot`, `game_restore` y `game_mod_event`.
- [x] Dos instancias inicializadas con el mismo `seed` y la misma secuencia de `game_input` producen snapshots binarios y hashes SHA-256/FNV-1a idénticos tras 600 ticks a 60 Hz.
- [x] `game_snapshot` y `game_restore` restauran el estado exacto en partidas con Rollback Netcode.

## 3. Aislamiento de Runtime y Sandbox de Mods Lua
- [x] El canvas de ejecución corre en `<iframe sandbox="allow-scripts">` con `connect-src 'none'`.
- [x] Almacenamiento `storage_get` / `storage_set` particionado por `(nodeOrigin, gameId, authorPubkey)` con límite de 5 MiB.
- [x] Mods en Lua son opt-in, se ejecutan en un Web Worker dedicado y el **Watchdog de 2 ms/tick** termina automáticamente scripts con bucles infinitos sin degradar los 60 FPS del juego principal.

## 4. Red P2P, Señalización y Privacidad
- [x] Servidor WebSocket (`/v1/signal`) aplica límite de 30 msg/s, payload máximo de 16 KiB, máximo 8 jugadores por sala y timeout de inactividad de 60 s.
- [x] Credenciales TURN efímeras (`GET /v1/turn-credentials`) firmadas con HMAC-SHA1 y rangos IP privados bloqueados en `deploy/coturn.conf`.
- [x] Modo **Relay-Only TURN** disponible para proteger la dirección IP de los jugadores en partidas públicas.
- [x] Telemetría desactivada por defecto (opt-in explícito conforme a Ley 1581 de 2012 y RGPD).

## 5. Calidad Móvil / PWA Cyberpunk
- [x] Instalable como PWA con `manifest.webmanifest` y Service Worker offline para paquetes verificados.
- [x] Controles táctiles adaptativos (D-Pad / Stick virtual + botones A/B + gesto de pausa) con objetivos táctiles $\ge 44 \times 44\text{ px}$ y soporte `safe-area-inset-*`.
- [x] Soporte completo de accesibilidad: navegación por teclado, alto contraste y respeto a `prefers-reduced-motion`.
