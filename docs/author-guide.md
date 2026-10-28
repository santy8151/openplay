# Guía de Autoría: Cómo publicar tu juego en OpenPlay

Esta guía explica paso a paso cómo crear, compilar, firmar y publicar un juego determinista en WebAssembly para cualquier nodo federado de **OpenPlay** usando el SDK oficial en Rust (`openplay-game-sdk`).

---

## 1. Requisitos Previos

- **Rust stable** con el target `wasm32-unknown-unknown`:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- Tu juego debe distribuirse bajo una **licencia open-source con identificador SPDX válido** (por ejemplo `MIT`, `Apache-2.0`, `GPL-3.0-only`, `MPL-2.0`, `BSD-3-Clause` o `CC0-1.0`).
- El paquete completo (`.wasm` + assets) no debe superar **20 MiB**.

---

## 2. Estructura del Contrato `host-abi/0`

Cuando usas `openplay-game-sdk`, solo necesitas implementar el trait `Game` y exportar los símbolos C-ABI mediante la macro `export_game!`:

```rust
use openplay_game_sdk::{export_game, host, Canvas, Color, Game, XorShift32};

pub struct MiJuego {
    rng: XorShift32,
    canvas: Canvas,
    x: i32,
}

impl Default for MiJuego {
    fn default() -> Self {
        Self {
            rng: XorShift32::new(1),
            canvas: Canvas::new(480, 320),
            x: 240,
        }
    }
}

impl Game for MiJuego {
    fn init(&mut self, seed: u32, width: u32, height: u32) {
        self.rng = XorShift32::new(seed);
        self.canvas.resize(width, height);
        host::log_str("Juego inicializado de forma determinista");
    }

    fn tick(&mut self, _dt_us: u32) {
        self.canvas.clear(Color::rgb(11, 15, 23));
        self.canvas.draw_circle(self.x, 160, 14, Color::rgb(0, 240, 255));
    }

    fn input(&mut self, kind: u32, _player: i32, dx: i32, _dy: i32) {
        if kind == 0 {
            self.x = (self.x + dx * 4).clamp(16, 464);
        }
    }

    fn net_recv(&mut self, _peer: u32, _data: &[u8]) {}

    fn framebuffer(&self) -> *const u8 {
        self.canvas.as_ptr()
    }

    fn snapshot(&self, out: &mut [u8]) -> usize {
        if out.len() < 4 {
            return 0;
        }
        out[0..4].copy_from_slice(&self.x.to_le_bytes());
        4
    }

    fn restore(&mut self, data: &[u8]) {
        if data.len() >= 4 {
            self.x = i32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        }
    }
}

export_game!(MiJuego);
```

### Reglas de Determinismo
1. **Prohibido usar reloj del sistema o entropía externa:** Usa siempre `XorShift32` inicializado con el `seed` recibido en `game_init`.
2. **Aritmética reproducible:** Preferir enteros o punto fijo `Q24.8` (`valor << 8`) para posiciones y velocidades físicas, evitando divergencias de punto flotante entre arquitecturas ARM64 (móvil) y x86_64 (escritorio).
3. **Snapshots completos:** `snapshot()` y `restore()` deben serializar e hidratar el 100% del estado mutable (incluyendo el estado interno del PRNG `rng.state()`).

---

## 3. Compilar el Binario WebAssembly

```bash
cargo build -p pong --target wasm32-unknown-unknown --release
```

El binario resultante estará en `target/wasm32-unknown-unknown/release/pong.wasm`.

---

## 4. Crear y Firmar `manifest.json` (RFC 8785 JCS + Ed25519)

Crea un archivo `manifest.json` declarando permisos mínimos, resolución virtual y el hash `SHA-256` del archivo `game.wasm`:

```json
{
  "schema": 1,
  "id": "dev.tuestudio.mijuego",
  "name": "Mi Juego Arcade",
  "version": "1.0.0",
  "license": "MIT",
  "author": {
    "name": "Tu Estudio",
    "pubkey": "ed25519:<TU_PUBKEY_BASE64>"
  },
  "abi": "host-abi/0",
  "entry": "game.wasm",
  "display": { "width": 480, "height": 320, "scale": "fit" },
  "permissions": ["audio", "storage", "net.p2p"],
  "multiplayer": { "mode": "p2p-lockstep", "min": 1, "max": 2, "tickrate": 60 },
  "mods": { "enabled": true, "lang": "lua", "hooks": ["on_init", "on_tick", "on_event"] },
  "files": [
    {
      "path": "game.wasm",
      "sha256": "<SHA256_HEX_DEL_ARCHIVO_WASM>",
      "size": 18432
    }
  ],
  "signature": "<FIRMA_ED25519_BASE64>"
}
```

La firma se calcula aplicando **RFC 8785 (JCS)** al JSON sin el campo `signature`, obteniendo su digest `SHA-256` de 32 bytes y firmándolo con tu clave privada Ed25519 (`@openplay/manifest` en TypeScript o `internal/manifest` en Go).

---

## 5. Publicar en un Nodo OpenPlay

Envía el manifiesto firmado al endpoint `POST /v1/games`:

```bash
curl -X POST http://localhost:8080/v1/games \
  -H "Content-Type: application/json" \
  -d @publish-payload.json
```

El nodo verificará instantáneamente el esquema, la licencia SPDX, el tamaño máximo (20 MiB) y la firma Ed25519 antes de incluirlo en `/v1/catalog` y en el índice federado `/v1/index.json`.
