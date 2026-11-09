# ⚡ OPENPLAY // 2099 — Federated Wasm Arcade, Cloud GPU Streaming & Stellar Soroban Ecosystem

[![Stellar](https://img.shields.io/badge/Stellar-Soroban_Testnet-7D00FF.svg?logo=stellar)](./docs/stellar-hackathon.md)
[![Smart Contract](https://img.shields.io/badge/Smart_Contract-Soroban_Rust_%2F_Wasm-00f0ff.svg)](./contracts/soroban-openplay)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-00f0ff.svg)](./LICENSE)
[![ABI: host-abi/0](https://img.shields.io/badge/Wasm_ABI-host--abi%2F0-ff2bd6.svg)](./AGENTS.md)
[![Design: Cyberpunk Neon](https://img.shields.io/badge/UI-Cyberpunk_Neon-fcee09.svg)](./apps/client)

**OpenPlay** es un ecosistema open source (**Apache-2.0**), modular y federado para descubrir, verificar y ejecutar juegos compilados a **WebAssembly**, con **212 Ports Web nativos** (Celeste, Undertale, Doom, GTA, Balatro, Half-Life...), **Cloud Gaming con GPU NVIDIA RTX vía WebRTC**, y **micropagos descentralizados sobre Stellar Soroban** con contratos inteligentes en Rust/Wasm.

> 🏆 **Edición Especial Stellar Blockchain Hackathon**: Consulta el [Whitepaper y Guía de Pitch para Jueces](./docs/stellar-hackathon.md).

---

## 🏗️ Arquitectura y Layout del Monorepo

```text
/contracts/soroban-openplay  Contrato Soroban en Rust/Wasm (Micropagos XLM/USDC, GPU Pool y Torneos)
/contracts/OpenPlayComputePool.sol  Contrato de referencia Solidity para pool descentralizado
/apps/client        PWA Cyberpunk (Preact + TS + Vite + Workbox + Freighter Stellar Wallet)
/apps/node          Nodo Federado REST (/v1) + Señalización WebSocket + Crawler ETag (Go 1.23)
/packages/abi       Tipos TS del Host ABI v0 + validador/loader Wasm + compilador de cartuchos Wasm
/packages/manifest  JSON Schema 2020-12 + canonicalización RFC 8785 (JCS) + firmas Ed25519 (TS/Go)
/packages/mods      Sandbox Lua aislado en Worker con watchdog de 2.0 ms/tick y corte a las 3 violaciones
/packages/lab       Simulador de latencia/jitter/pérdida en DataChannel + detector de desyncs + Replays
/crates/game-sdk    SDK en Rust (#![no_std] compatible) con macro export_game! para host-abi/0
/games/pong         CyberPong 2099 (1P vs IA / 2P Local / P2P Lockstep, Rust + Wasm ABI v0)
/games/arena        Neon Arena P2P (2-4 jugadores con proyectiles, dash y rollback/lockstep)
/deploy             docker-compose.yml (node-a, node-b, postgres 16, redis 7, coturn, caddy)
/docs               Arquitectura, Pitch Stellar Soroban, Threat Model, ADRs y Guías
```

---

## 🚀 Inicio Rápido (Desarrollo Local y Beta)

### 1. Instalar dependencias, compilar y pasar todos los tests
```bash
npm install
npm test
npm run build
```

### 2. Levantar el Frontend Cyberpunk + Wasm Sandbox Runner en vivo
```bash
npm run dev
```
Abre `http://localhost:5173` para explorar las **8 pantallas** del sistema Cyberpunk:
1. **CATÁLOGO / LOBBY (`#/lobby`)**: Buscador en tiempo real, filtros por chip (`ARCADE`, `P2P`, `LOCKSTEP`, `MODS`, `RETRO`, `CYBER`) y tarjetas con verificación criptográfica Ed25519.
2. **DETALLE DE JUEGO (`#/detail`)**: Inspector de firma Ed25519 sobre `sha256(JCS(manifest))`, historial de versiones, permisos y botón interactivo para **simular adulteración de 1 byte**.
3. **JUGAR (`#/play`)**: Runner Wasm con `<iframe sandbox="allow-scripts">` (sin `allow-same-origin`) + `MessageChannel`, verificación SHA-256 previa a `WebAssembly.instantiate`, paso fijo a 60Hz, blit RGBA8 a `<canvas>`, controles táctiles virtuales (`>=44px`), snapshots instantáneos de 64 bytes y **Panel de Mods Lua en vivo**.
4. **SALAS P2P (`#/rooms`)**: Creación/unión por código, negociación WebRTC `RTCPeerConnection` con 2 `DataChannels` (`#0 reliable ordered` y `#1 unreliable maxRetransmits=0`), credenciales TURN HMAC efímeras y chat fiable.
5. **NODOS FEDERADOS (`#/nodes`)**: Gestor de repositorios comunitarios con verificación de huella Ed25519, sincronización `ETag` y prueba de rechazo de peers con firma inválida.
6. **LAB DE RED (`#/lab`)**: Sliders de latencia (`0-400 ms`), jitter (`0-100 ms`) y pérdida (`0-30%`), gráfica en vivo y **Verificador 3x Replay Determinista**.
7. **AJUSTES Y PRIVACIDAD (`#/settings`)**: Modo `relay-only` (`iceTransportPolicy: 'relay'`), telemetría opt-in sin IP ni IDs persistentes, modo `prefers-reduced-motion`, audio UI sintetizado y formulario de Takedown (`POST /v1/reports`) cumpliendo Ley 1581 de Colombia y GDPR.
8. **STYLEGUIDE (`#/styleguide`)**: Catálogo interactivo de tokens CSS, tipografías autohospedadas (`Orbitron`, `Rajdhani`, `JetBrains Mono`) y componentes accesibles WCAG AA.

### 3. Levantar un Nodo Federado Completo con Docker Compose
```bash
docker compose -f deploy/docker-compose.yml up --build
```

---

## 📊 Rendimiento y Benchmarks del Runner (M3)

| Dispositivo Emulado | Viewport | Resolución Framebuffer | FPS Medio (600 ticks) | Tiempo de Tick Wasm | Presupuesto Mod Lua |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Pixel 5** (Chrome Android) | `393 × 851` | `480 × 320` RGBA8 | **60.0 FPS** | `0.38 ms` | `≤ 2.00 ms` (Watchdog OK) |
| **Apple iPhone 13** (Safari iOS PWA) | `390 × 844` | `480 × 320` RGBA8 | **60.0 FPS** | `0.31 ms` | `≤ 2.00 ms` (Watchdog OK) |
| **Desktop 1080p** (Chromium / Firefox) | `1280 × 800` | `480 × 320` RGBA8 | **60.0 FPS** | `0.19 ms` | `≤ 2.00 ms` (Watchdog OK) |

---

## 🔒 Seguridad, Reglas Duras y Documentación

- **Regla Dura de Contenido**: Solo se permiten juegos propios u open source con licencia SPDX explícita (`MIT`, `Apache-2.0`, `GPL-3.0-only`, etc.) y firma Ed25519 válida.
- **Documentación Técnica**:
  - [Arquitectura del Sistema](./docs/architecture.md)
  - [Modelo de Amenazas STRIDE y Privacidad (Ley 1581 / GDPR)](./docs/threat-model.md)
  - [Guía para Autores de Juegos (`host-abi/0`)](./docs/author-guide.md)
  - [Guía para Operadores de Nodos Federados](./docs/node-operator-guide.md)
  - [Checklist de Lanzamiento Beta](./docs/release-checklist.md)
  - [ADRs (0001 a 0004)](./docs/adr/)

---

## 📜 Licencia

Distribuido bajo la licencia **Apache-2.0**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
