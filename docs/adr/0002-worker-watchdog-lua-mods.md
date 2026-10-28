# ADR 0002: Sandbox de Mods Lua en Web Worker Dedicado con Watchdog de 2 ms

- **Estado:** Aceptado
- **Fecha:** 2026-10-27

## Contexto

OpenPlay permite modding opt-in en juegos que lo declaran en su `manifest.json` (`mods.enabled: true`). Sin embargo, ejecutar código de mods suministrado por usuarios o por la comunidad dentro del hilo principal de la UI o en el mismo contexto síncrono del bucle de 60 Hz (`16.66 ms` por frame) presenta dos riesgos críticos:
1. Un bucle infinito (`while true do end`) congelaría la interfaz y desconectaría la sesión WebRTC.
2. Un mod malicioso podría intentar leer el DOM, robar credenciales o realizar peticiones de red no autorizadas.

## Decisión

1. **Ejecución en Web Worker Dedicado:** Todo el motor de interpretación de mods Lua (`@openplay/mods`) se ejecuta en un Web Worker aislado, sin acceso al DOM, `localStorage` ni `fetch`/`XMLHttpRequest`.
2. **Presupuesto Estricto por Tick (Watchdog de 2 ms y 16 MiB):** Cada invocación a `on_init`, `on_tick` o `on_event` es supervisada por un temporizador watchdog en el host. Si el worker no responde dentro de **2 ms** (o supera **16 MiB** de memoria de estado), el host invoca `worker.terminate()` de inmediato, registra una alerta en el panel de diagnóstico y continúa ejecutando el juego base a 60 FPS sin interrupción.
3. **Activación 100% Opt-In:** Ningún mod se ejecuta a menos que el jugador lo habilite explícitamente en la interfaz antes o durante la sesión.

## Consecuencias

- **Resiliencia total del bucle a 60 FPS:** Incluso un mod con `while true do end` es neutralizado en ~2 ms sin perder un solo cuadro de renderizado.
- **Superficie de ataque nula hacia el DOM:** Los mods solo pueden emitir eventos estructurados (`emit_game_event`) que el juego procesa mediante `game_mod_event(ptr, len)`.
