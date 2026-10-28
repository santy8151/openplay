/**
 * Programmatic WebAssembly Binary Compiler & Deterministic Arcade Kernels (`host-abi/0`)
 *
 * Generates genuine, spec-compliant `.wasm` binary modules (`\0asm\x01\0\0\0`) that:
 * 1. Pass `WebAssembly.validate()` and `WebAssembly.compile()` natively in any browser or Node 22+ runtime.
 * 2. Export all `host-abi/0` symbols:
 *    - `memory` (16 pages = 1 MiB linear memory)
 *    - `game_alloc(len: i32) -> i32`
 *    - `game_init(seed: i32, w: i32, h: i32)`
 *    - `game_tick(dt_us: i32)`
 *    - `game_input(kind: i32, a: i32, b: i32, c: i32)`
 *    - `game_net_recv(peer: i32, ptr: i32, len: i32)`
 *    - `game_framebuffer() -> i32` (returns byte pointer 65536 to RGBA8 w*h*4 in Wasm linear memory)
 *    - `game_snapshot(ptr: i32, cap: i32) -> i32`
 *    - `game_restore(ptr: i32, len: i32)`
 *    - `game_mod_event(ptr: i32, len: i32)`
 * 3. Operate deterministically (only `seed` + `game_input` events, zero host clock/random inside `game_tick`).
 */

import { InputKind, KeyCode, NetChannel } from './types.js';

export type BuiltinGameId = 'dev.openplay.pong' | 'dev.openplay.arena' | 'dev.openplay.cyberrunner';

export const FRAMEBUFFER_PTR = 65536; // 0x10000 in Wasm linear memory
const HEAP_START_PTR = 8192; // 0x02000 in Wasm linear memory

function uleb128(value: number): number[] {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0);
  return bytes;
}

function sleb128(value: number): number[] {
  const bytes: number[] = [];
  let v = value | 0;
  let more = true;
  while (more) {
    let byte = v & 0x7f;
    v >>= 7;
    if ((v === 0 && (byte & 0x40) === 0) || (v === -1 && (byte & 0x40) !== 0)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

function encodeString(str: string): number[] {
  const utf8 = Array.from(new TextEncoder().encode(str));
  return [...uleb128(utf8.length), ...utf8];
}

function encodeSection(id: number, payload: number[]): number[] {
  return [id, ...uleb128(payload.length), ...payload];
}

/**
 * Compiles a valid `host-abi/0` WebAssembly binary module for the given `gameId`.
 * Embeds a custom section with `gameId` so each game has a unique cryptographic SHA-256 digest.
 */
export function buildCartridgeWasmBytes(gameId: BuiltinGameId = 'dev.openplay.pong'): Uint8Array {
  const I32 = 0x7f;
  const FUNC = 0x60;

  // Function signature types:
  // 0: (i32, i32) -> ()          [log, audio_play, game_restore, game_mod_event, mod_emit]
  // 1: (i32, i32, i32, i32) -> i32 [storage_get, storage_set, net_send]
  // 2: (i32) -> i32              [game_alloc]
  // 3: (i32, i32, i32) -> ()     [game_init, game_net_recv]
  // 4: (i32) -> ()               [game_tick]
  // 5: (i32, i32, i32, i32) -> ()[game_input]
  // 6: () -> i32                 [game_framebuffer]
  // 7: (i32, i32) -> i32         [game_snapshot]
  const types: number[][] = [
    [FUNC, 2, I32, I32, 0],
    [FUNC, 4, I32, I32, I32, I32, 1, I32],
    [FUNC, 1, I32, 1, I32],
    [FUNC, 3, I32, I32, I32, 0],
    [FUNC, 1, I32, 0],
    [FUNC, 4, I32, I32, I32, I32, 0],
    [FUNC, 0, 1, I32],
    [FUNC, 2, I32, I32, 1, I32]
  ];

  const typeSectionPayload = [
    ...uleb128(types.length),
    ...types.flat()
  ];

  // Imports from module "host":
  // 0: log (type 0)
  // 1: audio_play (type 0)
  // 2: storage_get (type 1)
  // 3: storage_set (type 1)
  // 4: net_send (type 1)
  // 5: mod_emit (type 0)
  // 6: kernel_init (type 3)
  // 7: kernel_tick (type 4)
  // 8: kernel_input (type 5)
  // 9: kernel_net_recv (type 3)
  // 10: kernel_snapshot (type 7)
  // 11: kernel_restore (type 0)
  // 12: kernel_mod_event (type 0)
  const importDefs: Array<[string, number]> = [
    ['log', 0],
    ['audio_play', 0],
    ['storage_get', 1],
    ['storage_set', 1],
    ['net_send', 1],
    ['mod_emit', 0],
    ['kernel_init', 3],
    ['kernel_tick', 4],
    ['kernel_input', 5],
    ['kernel_net_recv', 3],
    ['kernel_snapshot', 7],
    ['kernel_restore', 0],
    ['kernel_mod_event', 0]
  ];

  const importSectionPayload = [
    ...uleb128(importDefs.length),
    ...importDefs.flatMap(([name, typeIdx]) => [
      ...encodeString('host'),
      ...encodeString(name),
      0x00, // func import
      ...uleb128(typeIdx)
    ])
  ];

  // Defined functions (indices 13..21):
  // 13: game_alloc (type 2)
  // 14: game_init (type 3)
  // 15: game_tick (type 4)
  // 16: game_input (type 5)
  // 17: game_net_recv (type 3)
  // 18: game_framebuffer (type 6)
  // 19: game_snapshot (type 7)
  // 20: game_restore (type 0)
  // 21: game_mod_event (type 0)
  const funcTypes = [2, 3, 4, 5, 3, 6, 7, 0, 0];
  const funcSectionPayload = [
    ...uleb128(funcTypes.length),
    ...funcTypes.flatMap((t) => uleb128(t))
  ];

  // Memory section: 1 memory with min 16 pages (1 MiB), max 32 pages (2 MiB)
  const memorySectionPayload = [
    1,
    0x01, // has max
    ...uleb128(16),
    ...uleb128(32)
  ];

  // Global section: global 0 = mutable i32 bump allocator pointer initialized to HEAP_START_PTR
  const globalSectionPayload = [
    1,
    I32,
    0x01, // mutable
    0x41, // i32.const
    ...sleb128(HEAP_START_PTR),
    0x0b // end
  ];

  // Export section:
  const exportsList: Array<[string, number, number]> = [
    ['memory', 0x02, 0],
    ['game_alloc', 0x00, 13],
    ['game_init', 0x00, 14],
    ['game_tick', 0x00, 15],
    ['game_input', 0x00, 16],
    ['game_net_recv', 0x00, 17],
    ['game_framebuffer', 0x00, 18],
    ['game_snapshot', 0x00, 19],
    ['game_restore', 0x00, 20],
    ['game_mod_event', 0x00, 21]
  ];

  const exportSectionPayload = [
    ...uleb128(exportsList.length),
    ...exportsList.flatMap(([name, kind, idx]) => [
      ...encodeString(name),
      kind,
      ...uleb128(idx)
    ])
  ];

  // Code section bodies for functions 13..21:
  function encodeBody(locals: number[], instrs: number[]): number[] {
    const body = [...locals, ...instrs, 0x0b];
    return [...uleb128(body.length), ...body];
  }

  // 13: game_alloc(len: i32) -> i32 (bump allocator using global 0)
  const bodyAlloc = encodeBody(
    [1, 1, I32], // 1 local of type i32 (local 1 = old ptr)
    [
      0x23, 0x00, // global.get 0
      0x21, 0x01, // local.set 1
      0x23, 0x00, // global.get 0
      0x20, 0x00, // local.get 0 (len)
      0x6a,       // i32.add
      0x24, 0x00, // global.set 0
      0x20, 0x01  // local.get 1
    ]
  );

  // 14: game_init(seed, w, h) -> calls kernel_init (import 6)
  const bodyInit = encodeBody(
    [0],
    [0x20, 0x00, 0x20, 0x01, 0x20, 0x02, 0x10, ...uleb128(6)]
  );

  // 15: game_tick(dt_us) -> calls kernel_tick (import 7)
  const bodyTick = encodeBody(
    [0],
    [0x20, 0x00, 0x10, ...uleb128(7)]
  );

  // 16: game_input(kind, a, b, c) -> calls kernel_input (import 8)
  const bodyInput = encodeBody(
    [0],
    [0x20, 0x00, 0x20, 0x01, 0x20, 0x02, 0x20, 0x03, 0x10, ...uleb128(8)]
  );

  // 17: game_net_recv(peer, ptr, len) -> calls kernel_net_recv (import 9)
  const bodyNetRecv = encodeBody(
    [0],
    [0x20, 0x00, 0x20, 0x01, 0x20, 0x02, 0x10, ...uleb128(9)]
  );

  // 18: game_framebuffer() -> returns FRAMEBUFFER_PTR (65536)
  const bodyFramebuffer = encodeBody(
    [0],
    [0x41, ...sleb128(FRAMEBUFFER_PTR)]
  );

  // 19: game_snapshot(ptr, cap) -> i32 -> calls kernel_snapshot (import 10)
  const bodySnapshot = encodeBody(
    [0],
    [0x20, 0x00, 0x20, 0x01, 0x10, ...uleb128(10)]
  );

  // 20: game_restore(ptr, len) -> calls kernel_restore (import 11)
  const bodyRestore = encodeBody(
    [0],
    [0x20, 0x00, 0x20, 0x01, 0x10, ...uleb128(11)]
  );

  // 21: game_mod_event(ptr, len) -> calls kernel_mod_event (import 12)
  const bodyModEvent = encodeBody(
    [0],
    [0x20, 0x00, 0x20, 0x01, 0x10, ...uleb128(12)]
  );

  const bodies = [
    bodyAlloc,
    bodyInit,
    bodyTick,
    bodyInput,
    bodyNetRecv,
    bodyFramebuffer,
    bodySnapshot,
    bodyRestore,
    bodyModEvent
  ];

  const codeSectionPayload = [
    ...uleb128(bodies.length),
    ...bodies.flat()
  ];

  // Custom section (id 0) embedding the cartridge metadata so each cartridge binary has a distinct SHA-256
  const customSectionPayload = [
    ...encodeString('openplay.cartridge'),
    ...encodeString(`id=${gameId};abi=host-abi/0`)
  ];

  const wasmBytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // "\0asm"
    0x01, 0x00, 0x00, 0x00, // version 1
    ...encodeSection(1, typeSectionPayload),
    ...encodeSection(2, importSectionPayload),
    ...encodeSection(3, funcSectionPayload),
    ...encodeSection(5, memorySectionPayload),
    ...encodeSection(6, globalSectionPayload),
    ...encodeSection(7, exportSectionPayload),
    ...encodeSection(10, codeSectionPayload),
    ...encodeSection(0, customSectionPayload)
  ]);

  return wasmBytes;
}

/**
 * Deterministic XorShift32 PRNG — never touches Math.random() or host clock.
 */
export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 0x1337c0de;
  }

  nextU32(): number {
    let x = this.state >>> 0;
    x ^= (x << 13) >>> 0;
    x ^= x >>> 17;
    x ^= (x << 5) >>> 0;
    this.state = (x >>> 0) || 1;
    return this.state;
  }

  nextFloat(): number {
    return (this.nextU32() & 0x00ffffff) / 0x01000000;
  }

  getState(): number {
    return this.state >>> 0;
  }

  setState(s: number): void {
    this.state = (s >>> 0) || 1;
  }
}

export interface DeterministicKernelHooks {
  getMemory: () => WebAssembly.Memory;
  onAudioPlay: (id: number, volQ8: number) => void;
  onLog: (msg: string) => void;
  onNetSend: (peer: number, channel: NetChannel, data: Uint8Array) => number;
  onModEmit: (eventJson: string) => void;
}

export interface CartridgeKernel {
  init(seed: number, width: number, height: number): void;
  tick(dtUs: number): void;
  input(kind: number, a: number, b: number, c: number): void;
  netRecv(peer: number, ptr: number, len: number): void;
  snapshot(ptr: number, cap: number): number;
  restore(ptr: number, len: number): void;
  modEvent(ptr: number, len: number): void;
}

/**
 * Creates a deterministic RGBA8 arcade simulation kernel backed directly by `WebAssembly.Memory`.
 * Supports all 3 open-source games (`dev.openplay.pong`, `dev.openplay.arena`, `dev.openplay.cyberrunner`).
 */
export function createCartridgeKernel(
  gameId: BuiltinGameId,
  hooks: DeterministicKernelHooks
): CartridgeKernel {
  let width = 480;
  let height = 320;
  let tickCount = 0;
  const rng = new DeterministicRng(1337);

  // Shared input state bitmask
  let p1Up = 0, p1Down = 0, p1Left = 0, p1Right = 0, p1ActionA = 0, p1ActionB = 0;
  let p2Up = 0, p2Down = 0, p2Left = 0, p2Right = 0, p2ActionA = 0;

  // Modifiable gameplay parameters (controlled via `game_mod_event` from Lua mods!)
  let speedMultiplier = 1.0;
  let paddleSizeMultiplier = 1.0;
  let gravityAnomaly = 0.0;
  let neonThemeShift = 0; // 0=cyan/magenta, 1=yellow/green, 2=crimson/overdrive

  // Game 1: CyberPong 2099 state
  let paddle1Y = 120;
  let paddle2Y = 120;
  let ballX = 240;
  let ballY = 160;
  let ballVx = 220;
  let ballVy = 140;
  let score1 = 0;
  let score2 = 0;
  let twoPlayerMode = 0; // 0 = vs Cyber AI, 1 = 2P local/P2P

  // Game 2: Neon Arena 2099 (2-4P cyber battle) state
  interface Tank {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    hp: number;
    score: number;
    cooldown: number;
    dashTimer: number;
    color: [number, number, number];
  }
  interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    owner: number;
    ttl: number;
  }
  const tanks: Tank[] = [
    { x: 90, y: 160, vx: 0, vy: 0, angle: 0, hp: 100, score: 0, cooldown: 0, dashTimer: 0, color: [0, 240, 255] },
    { x: 390, y: 160, vx: 0, vy: 0, angle: Math.PI, hp: 100, score: 0, cooldown: 0, dashTimer: 0, color: [255, 43, 214] },
    { x: 240, y: 60, vx: 0, vy: 0, angle: Math.PI / 2, hp: 100, score: 0, cooldown: 0, dashTimer: 0, color: [252, 238, 9] },
    { x: 240, y: 260, vx: 0, vy: 0, angle: -Math.PI / 2, hp: 100, score: 0, cooldown: 0, dashTimer: 0, color: [57, 255, 136] }
  ];
  let bullets: Bullet[] = [];

  // Game 3: NetRunner Grid state
  let runnerX = 80;
  let runnerY = 160;
  let runnerVy = 0;
  let runnerShield = 100;
  let runnerDataShards = 0;
  let gridOffset = 0;

  function fillRect(
    fb: Uint8Array,
    x0: number,
    y0: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number
  ): void {
    const startX = Math.max(0, Math.floor(x0));
    const startY = Math.max(0, Math.floor(y0));
    const endX = Math.min(width, Math.floor(x0 + w));
    const endY = Math.min(height, Math.floor(y0 + h));
    for (let y = startY; y < endY; y++) {
      let rowIdx = (y * width + startX) * 4;
      for (let x = startX; x < endX; x++) {
        fb[rowIdx] = r;
        fb[rowIdx + 1] = g;
        fb[rowIdx + 2] = b;
        fb[rowIdx + 3] = 255;
        rowIdx += 4;
      }
    }
  }

  function drawDigit(fb: Uint8Array, digit: number, x: number, y: number, r: number, g: number, b: number): void {
    const patterns: Record<number, number[]> = {
      0: [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
      1: [0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
      2: [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
      3: [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
      4: [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
      5: [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
      6: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      7: [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      8: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      9: [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1]
    };
    const pat = patterns[Math.abs(digit) % 10] ?? patterns[0]!;
    const scale = 4;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (pat[row * 3 + col]) {
          fillRect(fb, x + col * scale, y + row * scale, scale - 1, scale - 1, r, g, b);
        }
      }
    }
  }

  function renderBackground(fb: Uint8Array): void {
    // Deep wet-asphalt dark background (#07060d -> RGB 7, 6, 13) with perspective neon grid lines
    const len = width * height * 4;
    for (let i = 0; i < len; i += 4) {
      fb[i] = 7;
      fb[i + 1] = 6;
      fb[i + 2] = 15;
      fb[i + 3] = 255;
    }

    // Horizontal & vertical cyber grid lines
    const gridR = neonThemeShift === 1 ? 35 : 22;
    const gridG = neonThemeShift === 1 ? 45 : 18;
    const gridB = neonThemeShift === 1 ? 20 : 52;

    for (let y = 0; y < height; y += 32) {
      fillRect(fb, 0, y, width, 1, gridR, gridG, gridB);
    }
    const shift = (tickCount >> 1) % 32;
    for (let x = shift; x < width; x += 32) {
      fillRect(fb, x, 0, 1, height, gridR, gridG, gridB);
    }

    // Top & bottom neon border rails
    fillRect(fb, 0, 0, width, 3, 0, 240, 255);
    fillRect(fb, 0, height - 3, width, 3, 255, 43, 214);
  }

  function tickPong(dtSec: number, fb: Uint8Array): void {
    const paddleH = Math.round(56 * paddleSizeMultiplier);
    const paddleW = 8;
    const paddleSpeed = 240 * speedMultiplier;

    if (p1Up) paddle1Y -= paddleSpeed * dtSec;
    if (p1Down) paddle1Y += paddleSpeed * dtSec;
    paddle1Y = Math.max(8, Math.min(height - paddleH - 8, paddle1Y));

    if (p2Up || p2Down) {
      twoPlayerMode = 1;
    }
    if (twoPlayerMode) {
      if (p2Up) paddle2Y -= paddleSpeed * dtSec;
      if (p2Down) paddle2Y += paddleSpeed * dtSec;
    } else {
      // Deterministic AI tracking ballY
      const targetY = ballY - paddleH / 2;
      const diff = targetY - paddle2Y;
      const aiMaxStep = paddleSpeed * 0.82 * dtSec;
      if (Math.abs(diff) > 4) {
        paddle2Y += Math.sign(diff) * Math.min(Math.abs(diff), aiMaxStep);
      }
    }
    paddle2Y = Math.max(8, Math.min(height - paddleH - 8, paddle2Y));

    // Apply optional mod gravity anomaly
    ballVy += gravityAnomaly * 180 * dtSec;

    ballX += ballVx * speedMultiplier * dtSec;
    ballY += ballVy * speedMultiplier * dtSec;

    // Top/bottom bounce
    if (ballY <= 8) {
      ballY = 8;
      ballVy = Math.abs(ballVy);
      hooks.onAudioPlay(1, 180);
    } else if (ballY >= height - 16) {
      ballY = height - 16;
      ballVy = -Math.abs(ballVy);
      hooks.onAudioPlay(1, 180);
    }

    // Left paddle collision
    if (ballX <= 24 + paddleW && ballX >= 16 && ballY + 8 >= paddle1Y && ballY <= paddle1Y + paddleH) {
      ballX = 24 + paddleW;
      const hitOffset = (ballY - (paddle1Y + paddleH / 2)) / (paddleH / 2);
      ballVx = Math.min(420, Math.abs(ballVx) * 1.05);
      ballVy = hitOffset * 230;
      hooks.onAudioPlay(2, 220);
      hooks.onModEmit(JSON.stringify({ type: 'paddle_hit', player: 1, tick: tickCount, speed: Math.round(ballVx) }));
    }

    // Right paddle collision
    if (
      ballX + 8 >= width - 24 - paddleW &&
      ballX <= width - 16 &&
      ballY + 8 >= paddle2Y &&
      ballY <= paddle2Y + paddleH
    ) {
      ballX = width - 24 - paddleW - 8;
      const hitOffset = (ballY - (paddle2Y + paddleH / 2)) / (paddleH / 2);
      ballVx = -Math.min(420, Math.abs(ballVx) * 1.05);
      ballVy = hitOffset * 230;
      hooks.onAudioPlay(2, 220);
      hooks.onModEmit(JSON.stringify({ type: 'paddle_hit', player: 2, tick: tickCount, speed: Math.round(Math.abs(ballVx)) }));
    }

    // Scoring
    if (ballX < 0) {
      score2 = (score2 + 1) % 100;
      ballX = width / 2;
      ballY = height / 2;
      ballVx = 220;
      ballVy = ((rng.nextU32() % 160) - 80) || 60;
      hooks.onAudioPlay(3, 255);
      hooks.onModEmit(JSON.stringify({ type: 'score', scorer: 2, score1, score2 }));
    } else if (ballX > width) {
      score1 = (score1 + 1) % 100;
      ballX = width / 2;
      ballY = height / 2;
      ballVx = -220;
      ballVy = ((rng.nextU32() % 160) - 80) || -60;
      hooks.onAudioPlay(3, 255);
      hooks.onModEmit(JSON.stringify({ type: 'score', scorer: 1, score1, score2 }));
    }

    // Render center dashed net
    for (let y = 10; y < height - 10; y += 16) {
      fillRect(fb, width / 2 - 1, y, 2, 8, 42, 36, 80);
    }

    // Render scores
    drawDigit(fb, Math.floor(score1 / 10), width / 2 - 56, 18, 0, 240, 255);
    drawDigit(fb, score1 % 10, width / 2 - 38, 18, 0, 240, 255);
    drawDigit(fb, Math.floor(score2 / 10), width / 2 + 24, 18, 255, 43, 214);
    drawDigit(fb, score2 % 10, width / 2 + 42, 18, 255, 43, 214);

    // Render P1 paddle (Neon Cyan)
    fillRect(fb, 22, paddle1Y - 2, paddleW + 4, paddleH + 4, 0, 90, 120);
    fillRect(fb, 24, paddle1Y, paddleW, paddleH, 0, 240, 255);

    // Render P2 paddle (Neon Magenta)
    fillRect(fb, width - 24 - paddleW - 2, paddle2Y - 2, paddleW + 4, paddleH + 4, 120, 15, 95);
    fillRect(fb, width - 24 - paddleW, paddle2Y, paddleW, paddleH, 255, 43, 214);

    // Render Ball (Neon Yellow with afterglow)
    const ballColor: [number, number, number] =
      neonThemeShift === 1 ? [57, 255, 136] : neonThemeShift === 2 ? [255, 56, 96] : [252, 238, 9];
    fillRect(fb, ballX - ballVx * 0.02, ballY - ballVy * 0.02, 8, 8, ballColor[0] >> 2, ballColor[1] >> 2, ballColor[2] >> 2);
    fillRect(fb, ballX, ballY, 8, 8, ballColor[0], ballColor[1], ballColor[2]);
  }

  function tickArena(dtSec: number, fb: Uint8Array): void {
    const moveSpeed = 145 * speedMultiplier;
    const p1 = tanks[0]!;
    if (p1Left) p1.x -= moveSpeed * dtSec;
    if (p1Right) p1.x += moveSpeed * dtSec;
    if (p1Up) p1.y -= moveSpeed * dtSec;
    if (p1Down) p1.y += moveSpeed * dtSec;

    if (p1Left || p1Right || p1Up || p1Down) {
      p1.angle = Math.atan2((p1Down ? 1 : 0) - (p1Up ? 1 : 0), (p1Right ? 1 : 0) - (p1Left ? 1 : 0));
    }

    if (p1ActionB && p1.dashTimer <= 0) {
      p1.x += Math.cos(p1.angle) * 42;
      p1.y += Math.sin(p1.angle) * 42;
      p1.dashTimer = 45;
      hooks.onAudioPlay(2, 210);
    }

    if (p1ActionA && p1.cooldown <= 0) {
      bullets.push({
        x: p1.x + 8,
        y: p1.y + 8,
        vx: Math.cos(p1.angle) * 320,
        vy: Math.sin(p1.angle) * 320,
        owner: 0,
        ttl: 90
      });
      p1.cooldown = 14;
      hooks.onAudioPlay(1, 200);
    }

    // Deterministic bot/peer simulation for tanks 1..3
    for (let idx = 1; idx < tanks.length; idx++) {
      const t = tanks[idx]!;
      const target = tanks[0]!;
      const dx = target.x - t.x;
      const dy = target.y - t.y;
      t.angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 95) {
        t.x += (dx / dist) * (75 * speedMultiplier) * dtSec;
        t.y += (dy / dist) * (75 * speedMultiplier) * dtSec;
      } else if (dist < 60) {
        t.x -= (dx / dist) * 60 * dtSec;
        t.y -= (dy / dist) * 60 * dtSec;
      }
      if (t.cooldown <= 0 && (tickCount + idx * 19) % 45 === 0) {
        bullets.push({
          x: t.x + 8,
          y: t.y + 8,
          vx: Math.cos(t.angle) * 240,
          vy: Math.sin(t.angle) * 240,
          owner: idx,
          ttl: 80
        });
        t.cooldown = 35;
      }
    }

    for (const t of tanks) {
      t.x = Math.max(16, Math.min(width - 32, t.x));
      t.y = Math.max(24, Math.min(height - 32, t.y));
      if (t.cooldown > 0) t.cooldown--;
      if (t.dashTimer > 0) t.dashTimer--;
    }

    // Obstacles in center arena
    const obstacles = [
      { x: 150, y: 100, w: 28, h: 120 },
      { x: 302, y: 100, w: 28, h: 120 }
    ];
    for (const obs of obstacles) {
      fillRect(fb, obs.x - 1, obs.y - 1, obs.w + 2, obs.h + 2, 0, 240, 255);
      fillRect(fb, obs.x, obs.y, obs.w, obs.h, 21, 18, 42);
    }

    // Update & render bullets
    const activeBullets: Bullet[] = [];
    for (const b of bullets) {
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;
      b.ttl--;
      if (b.ttl <= 0 || b.x < 4 || b.x > width - 4 || b.y < 4 || b.y > height - 4) {
        continue;
      }
      let hit = false;
      for (let i = 0; i < tanks.length; i++) {
        if (i === b.owner) continue;
        const t = tanks[i]!;
        if (b.x >= t.x && b.x <= t.x + 16 && b.y >= t.y && b.y <= t.y + 16) {
          t.hp -= 25;
          hit = true;
          hooks.onAudioPlay(3, 220);
          if (t.hp <= 0) {
            t.hp = 100;
            t.x = 60 + (rng.nextU32() % (width - 120));
            t.y = 50 + (rng.nextU32() % (height - 100));
            tanks[b.owner]!.score = (tanks[b.owner]!.score + 1) % 100;
            hooks.onModEmit(JSON.stringify({ type: 'arena_frag', killer: b.owner, victim: i, tick: tickCount }));
          }
          break;
        }
      }
      if (!hit) {
        activeBullets.push(b);
        fillRect(fb, b.x - 2, b.y - 2, 5, 5, 252, 238, 9);
      }
    }
    bullets = activeBullets;

    // Render tanks & HP bars
    for (let i = 0; i < tanks.length; i++) {
      const t = tanks[i]!;
      const [r, g, b] = t.color;
      fillRect(fb, t.x - 2, t.y - 2, 20, 20, r >> 2, g >> 2, b >> 2);
      fillRect(fb, t.x, t.y, 16, 16, r, g, b);
      // Turret barrel
      const bx = t.x + 6 + Math.cos(t.angle) * 10;
      const by = t.y + 6 + Math.sin(t.angle) * 10;
      fillRect(fb, bx, by, 5, 5, 255, 255, 255);
      // Health bar
      fillRect(fb, t.x, t.y - 6, 16, 3, 40, 20, 40);
      fillRect(fb, t.x, t.y - 6, Math.round((16 * t.hp) / 100), 3, 57, 255, 136);
      drawDigit(fb, t.score % 10, 24 + i * 44, 12, r, g, b);
    }
  }

  function tickCyberRunner(dtSec: number, fb: Uint8Array): void {
    gridOffset = (gridOffset + Math.round(220 * speedMultiplier * dtSec)) % width;
    if (p1Up) runnerVy -= 480 * dtSec;
    if (p1Down) runnerVy += 480 * dtSec;
    if (p1Left) runnerX = Math.max(24, runnerX - 200 * dtSec);
    if (p1Right) runnerX = Math.min(width - 48, runnerX + 200 * dtSec);

    runnerVy *= 0.92;
    runnerY = Math.max(28, Math.min(height - 40, runnerY + runnerVy * dtSec));

    if (tickCount % 30 === 0) {
      runnerDataShards = (runnerDataShards + 1) % 100;
    }

    // Draw scrolling neon highway gates
    for (let i = 0; i < 4; i++) {
      const gx = (width - ((tickCount * 4 + i * 120) % width));
      const gapY = 70 + ((i * 53) % 140);
      fillRect(fb, gx, 16, 8, gapY - 20, 255, 43, 214);
      fillRect(fb, gx, gapY + 56, 8, height - gapY - 72, 0, 240, 255);

      if (Math.abs(gx - runnerX) < 10 && (runnerY < gapY - 16 || runnerY + 14 > gapY + 52)) {
        runnerShield = Math.max(10, runnerShield - 1);
        hooks.onAudioPlay(1, 150);
      }
    }

    // Draw NetRunner vehicle
    fillRect(fb, runnerX - 6, runnerY + 2, 24, 12, 0, 110, 140);
    fillRect(fb, runnerX, runnerY, 20, 14, 0, 240, 255);
    fillRect(fb, runnerX + 14, runnerY + 4, 8, 6, 252, 238, 9);

    drawDigit(fb, Math.floor(runnerDataShards / 10), width - 52, 16, 57, 255, 136);
    drawDigit(fb, runnerDataShards % 10, width - 34, 16, 57, 255, 136);
  }

  function renderFrame(): void {
    const mem = hooks.getMemory();
    const fb = new Uint8Array(mem.buffer, FRAMEBUFFER_PTR, width * height * 4);
    renderBackground(fb);
    const dtSec = 1 / 60;
    if (gameId === 'dev.openplay.pong') {
      tickPong(dtSec, fb);
    } else if (gameId === 'dev.openplay.arena') {
      tickArena(dtSec, fb);
    } else {
      tickCyberRunner(dtSec, fb);
    }
  }

  return {
    init(seed: number, w: number, h: number): void {
      width = Math.max(64, Math.min(640, w || 480));
      height = Math.max(64, Math.min(480, h || 320));
      tickCount = 0;
      rng.setState(seed || 1337);
      paddle1Y = height / 2 - 28;
      paddle2Y = height / 2 - 28;
      ballX = width / 2;
      ballY = height / 2;
      ballVx = 220;
      ballVy = 140;
      score1 = 0;
      score2 = 0;
      speedMultiplier = 1.0;
      paddleSizeMultiplier = 1.0;
      gravityAnomaly = 0.0;
      neonThemeShift = 0;
      bullets = [];
      renderFrame();
      hooks.onLog(`[${gameId}] Initialized host-abi/0 (seed=${seed}, ${width}x${height})`);
    },

    tick(_dtUs: number): void {
      tickCount++;
      renderFrame();
    },

    input(kind: number, a: number, b: number, _c: number): void {
      if (kind === InputKind.KeyDown || kind === InputKind.KeyUp || kind === InputKind.TouchButton) {
        const pressed = kind === InputKind.KeyDown || (kind === InputKind.TouchButton && b !== 0) ? 1 : 0;
        switch (a) {
          case KeyCode.Up:
            p1Up = pressed;
            break;
          case KeyCode.Down:
            p1Down = pressed;
            break;
          case KeyCode.Left:
            p1Left = pressed;
            break;
          case KeyCode.Right:
            p1Right = pressed;
            break;
          case KeyCode.ActionA:
            p1ActionA = pressed;
            break;
          case KeyCode.ActionB:
            p1ActionB = pressed;
            break;
          case KeyCode.Player2Up:
            p2Up = pressed;
            break;
          case KeyCode.Player2Down:
            p2Down = pressed;
            break;
          case KeyCode.Player2Left:
            p2Left = pressed;
            break;
          case KeyCode.Player2Right:
            p2Right = pressed;
            break;
          case KeyCode.Player2ActionA:
            p2ActionA = pressed;
            break;
        }
      }
    },

    netRecv(_peer: number, ptr: number, len: number): void {
      const mem = hooks.getMemory();
      const bytes = new Uint8Array(mem.buffer, ptr, len);
      if (bytes.length >= 2) {
        p2Up = bytes[0]! ? 1 : 0;
        p2Down = bytes[1]! ? 1 : 0;
        twoPlayerMode = 1;
      }
    },

    snapshot(ptr: number, cap: number): number {
      const SNAPSHOT_SIZE = 128;
      if (cap < SNAPSHOT_SIZE) return 0;
      const mem = hooks.getMemory();
      const view = new DataView(mem.buffer, ptr, SNAPSHOT_SIZE);
      view.setUint32(0, tickCount, true);
      view.setUint32(4, rng.getState(), true);
      view.setFloat64(8, paddle1Y, true);
      view.setFloat64(16, paddle2Y, true);
      view.setFloat64(24, ballX, true);
      view.setFloat64(32, ballY, true);
      view.setFloat64(40, ballVx, true);
      view.setFloat64(48, ballVy, true);
      view.setUint32(56, score1, true);
      view.setUint32(60, score2, true);
      view.setFloat64(64, tanks[0]!.x, true);
      view.setFloat64(72, tanks[0]!.y, true);
      view.setFloat64(80, runnerX, true);
      view.setFloat64(88, runnerY, true);
      view.setFloat64(96, speedMultiplier, true);
      view.setFloat64(104, paddleSizeMultiplier, true);
      view.setUint32(112, twoPlayerMode, true);
      return SNAPSHOT_SIZE;
    },

    restore(ptr: number, len: number): void {
      if (len < 128) return;
      const mem = hooks.getMemory();
      const view = new DataView(mem.buffer, ptr, 128);
      tickCount = view.getUint32(0, true);
      rng.setState(view.getUint32(4, true));
      paddle1Y = view.getFloat64(8, true);
      paddle2Y = view.getFloat64(16, true);
      ballX = view.getFloat64(24, true);
      ballY = view.getFloat64(32, true);
      ballVx = view.getFloat64(40, true);
      ballVy = view.getFloat64(48, true);
      score1 = view.getUint32(56, true);
      score2 = view.getUint32(60, true);
      tanks[0]!.x = view.getFloat64(64, true);
      tanks[0]!.y = view.getFloat64(72, true);
      runnerX = view.getFloat64(80, true);
      runnerY = view.getFloat64(88, true);
      speedMultiplier = view.getFloat64(96, true);
      paddleSizeMultiplier = view.getFloat64(104, true);
      twoPlayerMode = view.getUint32(112, true);
    },

    modEvent(ptr: number, len: number): void {
      const mem = hooks.getMemory();
      const raw = new TextDecoder().decode(new Uint8Array(mem.buffer, ptr, len));
      try {
        const parsed = JSON.parse(raw) as { name?: string; data?: Record<string, unknown> };
        if (parsed.name === 'set_speed' && typeof parsed.data?.multiplier === 'number') {
          speedMultiplier = Math.max(0.4, Math.min(3.0, parsed.data.multiplier));
        } else if (parsed.name === 'set_paddle_scale' && typeof parsed.data?.scale === 'number') {
          paddleSizeMultiplier = Math.max(0.5, Math.min(2.5, parsed.data.scale));
        } else if (parsed.name === 'set_gravity' && typeof parsed.data?.gravity === 'number') {
          gravityAnomaly = Math.max(-2.0, Math.min(2.0, parsed.data.gravity));
        } else if (parsed.name === 'set_neon_theme' && typeof parsed.data?.theme === 'number') {
          neonThemeShift = parsed.data.theme % 3;
        }
      } catch {
        // Ignore malformed mod event JSON
      }
    }
  };
}
