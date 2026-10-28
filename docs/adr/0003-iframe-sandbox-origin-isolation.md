# ADR 0003: Aislamiento de Origen e Iframe Sandbox para el Runtime de Juegos

- **Estado:** Aceptado
- **Fecha:** 2026-10-27

## Contexto

La PWA principal de OpenPlay gestiona la identidad del usuario (sesión de invitado o token OIDC de autor), la lista de nodos federados de confianza y la configuración de privacidad. Los paquetes de juegos provienen de múltiples autores y nodos federados. Aunque están firmados criptográficamente, el principio de mínimo privilegio exige que un juego nunca pueda acceder al origen (`window.origin`), cookies, IndexedDB global ni red directa de la aplicación principal.

## Decisión

1. **Iframe con Origen Opaco:** El contenedor de ejecución monta el juego dentro de un `<iframe sandbox="allow-scripts">` (omitiendo deliberadamente `allow-same-origin`, `allow-forms`, `allow-popups` y `allow-top-navigation`).
2. **Subdominio Dedicado en Producción (`games.<domain>`):** En despliegues con Caddy (`deploy/Caddyfile`), el runtime se sirve bajo `games.<domain>` con la política:
   ```http
   Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; worker-src blob:;
   ```
3. **Puente de Mensajes Estrechamente Tipado:** Toda comunicación entre la PWA y el iframe ocurre mediante `postMessage` validando el esquema del mensaje; las llamadas a `storage_get`/`storage_set` del juego se particionan bajo la clave compuesta `(nodeOrigin, gameId, authorPubkey)` con límite estricto de 5 MiB.

## Consecuencias

- **Imposibilidad de exfiltración por red (`connect-src 'none'`):** Incluso si un juego tuviera permiso `net.p2p`, los paquetes de red pasan como bytes opacos por el puente del host hacia el DataChannel WebRTC de la sala actual, sin poder contactar servidores arbitrarios en Internet.
- **Aislamiento de almacenamiento:** Un juego jamás puede leer ni sobrescribir las partidas guardadas de otro juego o autor.
