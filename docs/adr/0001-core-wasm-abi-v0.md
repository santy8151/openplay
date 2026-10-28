# ADR 0001: Módulo Core WebAssembly ABI v0 (`host-abi/0`) frente a WASI Completo

- **Estado:** Aceptado
- **Fecha:** 2026-10-27

## Contexto

OpenPlay necesita un contrato binario estable para ejecutar juegos arcade 2D deterministas en navegadores móviles (iOS Safari y Android Chrome) y de escritorio, soportando multijugador P2P mediante **Lockstep** y **Rollback Netcode**.

Evaluamos dos alternativas principales:
1. **WASI Preview 1 / Preview 2 completo** (`wasm32-wasip1` / Component Model).
2. **Un ABI C minimalista sobre un módulo Core WebAssembly (`host-abi/0`)** con 9 funciones exportadas y 6 funciones importadas bajo el espacio de nombres `"host"`.

## Decisión

Adoptamos el contrato minimalista **`host-abi/0`** sobre `wasm32-unknown-unknown`.

### Exportaciones del Juego (`host-abi/0`)
- `memory`
- `game_alloc(len: u32) -> u32`
- `game_init(seed: u32, w: u32, h: u32)`
- `game_tick(dt_us: u32)`
- `game_input(kind: u32, a: i32, b: i32, c: i32)`
- `game_net_recv(peer: u32, ptr: u32, len: u32)`
- `game_framebuffer() -> u32`
- `game_snapshot(ptr: u32, cap: u32) -> u32`
- `game_restore(ptr: u32, len: u32)`
- `game_mod_event(ptr: u32, len: u32)`

### Importaciones del Host (`"host"`)
- `log`, `audio_play`, `storage_get`, `storage_set`, `net_send`, `mod_emit`

## Consecuencias

- **Determinismo garantizado por construcción:** Al no exponer syscalls WASI como `clock_time_get` o `random_get`, es imposible que un juego introduzca no-determinismo accidental por relojes del sistema o entropía del host.
- **Binarios ultracompactos (10 KiB – 40 KiB):** Carga instantánea en redes móviles 4G y caché offline trivial.
- **Soporte nativo de Rollback Netcode:** `game_snapshot` y `game_restore` son ciudadanos de primera clase del ABI.
