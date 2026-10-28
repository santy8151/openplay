# Modelo de Amenazas (STRIDE) y Política de Privacidad — OpenPlay

Este documento define el modelo de amenazas de seguridad bajo la metodología **STRIDE**, las mitigaciones técnicas implementadas en el código de OpenPlay, y los lineamientos de privacidad bajo la **Ley 1581 de 2012 (Colombia)** y el **RGPD (GDPR)**.

---

## 1. Análisis de Amenazas STRIDE y Mitigaciones

| ID | Categoría STRIDE | Amenaza Concreta | Impacto Potencial | Mitigación Implementada |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | **Spoofing & Tampering** | Manifiesto o binario `.wasm` adulterado por un nodo malicioso o ataque Man-in-the-Middle. | Ejecución de código no autorizado por el autor original o suplantación de identidad. | Canonización determinista **RFC 8785 (JCS)** + firma **Ed25519** sobre `sha256(JCS(manifest_sin_signature))`. El cliente y los nodos pares verifican tanto la firma Ed25519 como el hash `SHA-256` de cada archivo listado en `files[]` antes de ejecutar `WebAssembly.instantiate`. |
| **T-02** | **Elevation of Privilege / DoS** | Binario Wasm o script de mod Lua con bucle infinito (`while true do end`) o agotamiento de memoria. | Congelamiento de la pestaña del navegador del jugador o caída del cliente móvil. | Los juegos corren en el ABI restringido `host-abi/0` con memoria lineal acotada; los mods Lua corren en un **Web Worker aislado** supervisado por un **Watchdog de 2 ms por tick** y límite de 16 MiB que ejecuta `worker.terminate()` automáticamente ante cualquier exceso. |
| **T-03** | **Information Disclosure & XSS** | Intento de exfiltración de tokens de sesión, lectura de `localStorage` global o XSS desde un juego hacia la PWA principal. | Robo de sesión o acceso a datos de otros juegos. | El runtime se monta en un `<iframe sandbox="allow-scripts">` (sin `allow-same-origin`) bajo un subdominio separado (`games.<domain>`) con `CSP: default-src 'none'; connect-src 'none'`. El almacenamiento `storage_get`/`storage_set` está particionado por `(nodeOrigin, gameId, authorPubkey)` con cuota máxima de 5 MiB. |
| **T-04** | **Tampering (Federación)** | Un nodo federado intenta inyectar entradas falsas en `/v1/index.json` o publicar juegos sin licencia open-source válida. | Contaminación del catálogo federado o infracción de las reglas duras de licenciamiento. | `internal/federation/crawler.go` y `internal/manifest/verify.go` validan la lista blanca **SPDX**, el límite de **20 MiB** por paquete y la firma Ed25519 del nodo; cualquier índice con firma inválida queda marcado como `signature_rejected` y es descartado. |
| **T-05** | **Information Disclosure (P2P IP Leak)** | Exposición de la dirección IP residencial del jugador a desconocidos durante partidas P2P WebRTC. | Deanonimización geográfica o ataques dirigidos a la conexión doméstica del jugador. | Modo **Relay-Only TURN** configurable con un clic en la UI (activable por defecto para partidas públicas), respaldado por credenciales efímeras HMAC-SHA1 (`internal/turn/hmac.go`) sobre `coturn`, ocultando la IP host/srflx del par. |
| **T-06** | **Denial of Service (Señalización y Salas)** | Inundación de mensajes WebSocket en `/v1/signal` o creación masiva de salas fantasma. | Agotamiento de descriptores de red o memoria en el nodo Go. | `internal/signal/ws.go` aplica **Token Bucket de 30 mensajes/segundo** por conexión, tamaño máximo de trama de **16 KiB**, **máximo 8 jugadores por sala**, y desconexión automática por inactividad a los **60 segundos** (`IdleTimeout`). |

---

## 2. Reglas Éticas y Legales No Negociables

- **Prohibición absoluta de piratería o modificación de binarios de terceros:** OpenPlay rechaza en validación de esquema y servidor cualquier paquete sin identificador **SPDX** aprobado (`MIT`, `Apache-2.0`, `BSD-3-Clause`, `GPL-3.0-only`, `MPL-2.0`, `CC0-1.0`, etc.).
- **Sin inyección binaria ni bypass de DRM:** El sistema solo carga módulos WebAssembly compilados para el contrato limpio `host-abi/0` y mods declarativos sobre hooks explícitos (`on_init`, `on_tick`, `on_event`).

---

## 3. Política de Privacidad y Protección de Datos (Ley 1581 de 2012 Colombia / RGPD)

### 3.1 Minimización de Datos
- **Sesiones de Invitado Efímeras:** Para jugar en solitario o en salas P2P no se exige correo electrónico, nombre real ni registro permanente. El endpoint `POST /v1/auth/guest` genera un alias temporal (`PILOT-XXXX`) sin almacenar datos personales identificables (PII).
- **Autores Federados:** Los autores que publican juegos se identifican mediante su llave pública criptográfica `ed25519:<base64>` y un alias público elegido libremente.

### 3.2 Telemetría 100% Opt-In y Anónima
- La telemetría de rendimiento (FPS promedio, RTT de red simulada/real y tasa de caída de paquetes) está **desactivada por defecto**.
- Solo cuando el usuario activa explícitamente el interruptor de telemetría en la configuración de la PWA se recolectan métricas agregadas sin dirección IP, sin huella digital del dispositivo (*fingerprinting*) y sin identificadores persistentes.

### 3.3 Derechos de los Titulares (Habeas Data — Ley 1581 / Art. 15-22 RGPD)
Todo usuario o autor tiene derecho a:
1. **Conocer, actualizar y rectificar** cualquier metadato asociado a su cuenta OIDC o perfil de autor en el nodo.
2. **Suprimir** sus datos locales instantáneamente desde la PWA vaciando el almacenamiento particionado IndexedDB/Cache API, o solicitar la baja de su perfil de autor en el nodo operador.
3. **Revocar** el consentimiento de telemetría opt-in en cualquier momento con efecto inmediato.
