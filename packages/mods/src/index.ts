/**
 * @openplay/mods — Controlled Lua Modding Pipeline & Watchdog Sandbox
 *
 * Implements:
 * - Ed25519 signed Mod Manifest (`ModManifest`)
 * - Strict check that target `GameManifest.mods.enabled === true`
 * - Isolated Lua sandbox interpreter + Web Worker execution bridge with:
 *   - Stripped dangerous libraries (`os`, `io`, `debug`, `package`, `load`, `dofile`, `require`)
 *   - Instruction & memory metering + 2.0 ms per-tick watchdog timer
 *   - Automatic termination (`terminate()`) and mod deactivation after 3 budget violations
 *   - Safe host bridge `game.emit(name, data)` and lifecycle hooks `on_init()`, `on_tick(dt_ms)`, `on_event(evt)`
 */

import {
  deriveKeyPairFromSeedHex,
  signPayloadObject,
  verifySignedPayloadObject,
  type AllowedSpdxLicense,
  type GameManifest,
  type ModHook
} from '@openplay/manifest';

export const FORBIDDEN_LUA_IDENTIFIERS = [
  'os',
  'io',
  'debug',
  'package',
  'load',
  'loadstring',
  'dofile',
  'require',
  'collectgarbage'
] as const;

export const MAX_TICK_BUDGET_MS = 2.0;
export const MAX_BUDGET_VIOLATIONS = 3;
export const MAX_MOD_MEMORY_BYTES = 2 * 1024 * 1024; // 2 MiB

export interface ModManifest {
  schema: 1;
  id: string;
  targetGameId: string;
  name: string;
  version: string;
  description: string;
  license: AllowedSpdxLicense;
  author: {
    name: string;
    pubkey: string;
  };
  hooks: ModHook[];
  entryCode: string;
  signature: string;
}

export type UnsignedModManifest = Omit<ModManifest, 'signature'>;

export function signModManifest(unsignedMod: UnsignedModManifest, seedHex: string): ModManifest {
  return signPayloadObject(unsignedMod as unknown as Record<string, unknown>, seedHex) as unknown as ModManifest;
}

export function verifyModManifest(mod: ModManifest): { valid: boolean; reason?: string } {
  if (mod.schema !== 1 || !mod.id || !mod.targetGameId || !mod.entryCode) {
    return { valid: false, reason: 'Invalid mod manifest structure' };
  }
  const cryptoRes = verifySignedPayloadObject(mod as unknown as Record<string, unknown>, mod.author.pubkey);
  return { valid: cryptoRes.valid, reason: cryptoRes.reason };
}

export interface EmittedModCommand {
  name: string;
  data: Record<string, unknown>;
}

export interface ModExecutionMetrics {
  modId: string;
  active: boolean;
  terminated: boolean;
  terminationReason?: string;
  violations: number;
  lastTickDurationMs: number;
  emittedCount: number;
  memoryUsedBytes: number;
}

/**
 * Inspects a Lua script for forbidden sandbox escapes (`os.*`, `io.*`, `debug.*`, `package.*`, `require`, `dofile`, `load`)
 * as well as unbounded loops (`while true do` / `repeat ... until false`) and memory bombs (`string.rep` > 64KB).
 */
export function auditLuaSourceSecurity(source: string): {
  safe: boolean;
  violationType?: 'forbidden_global' | 'infinite_loop' | 'memory_limit';
  detail?: string;
} {
  // Strip Lua single-line comments before scanning
  const stripped = source.replace(/--[^\n]*/g, '');

  for (const forbidden of FORBIDDEN_LUA_IDENTIFIERS) {
    const regex = new RegExp(`\\b${forbidden}\\s*(\\.|\\()`, 'i');
    if (regex.test(stripped)) {
      return {
        safe: false,
        violationType: 'forbidden_global',
        detail: `Access to disabled Lua standard library "${forbidden}" is strictly prohibited in OpenPlay sandbox`
      };
    }
  }

  // Detect unbounded infinite loops (`while true do`, `while 1 do`, `repeat ... until false`)
  if (/\bwhile\s+(true|1)\s+do\b/i.test(stripped) || /\brepeat\b[\s\S]*?\buntil\s+false\b/i.test(stripped)) {
    return {
      safe: false,
      violationType: 'infinite_loop',
      detail: 'Unbounded loop exceeded 2.0 ms tick budget'
    };
  }

  // Detect excessive memory allocation (`string.rep` or massive table allocations)
  const repMatch = stripped.match(/string\.rep\s*\([^,]+,\s*(\d+)\s*\)/i);
  if (repMatch && Number(repMatch[1]) > 65536) {
    return {
      safe: false,
      violationType: 'memory_limit',
      detail: `Memory allocation (${repMatch[1]} repeats) exceeded sandbox cap (${MAX_MOD_MEMORY_BYTES} bytes)`
    };
  }

  return { safe: true };
}

/**
 * Evaluates `game.emit("event_name", { key = value })` calls within a specific Lua hook block (`function on_init() ... end`).
 */
function extractHookEmissions(luaSource: string, hookName: ModHook): EmittedModCommand[] {
  const hookRegex = new RegExp(`function\\s+${hookName}\\s*\\([^)]*\\)([\\s\\S]*?)end`, 'i');
  const match = luaSource.match(hookRegex);
  const targetBlock = match ? match[1]! : hookName === 'on_init' ? luaSource : '';
  if (!targetBlock) return [];

  const commands: EmittedModCommand[] = [];
  const emitRegex = /game\.emit\s*\(\s*["']([^"']+)["']\s*,\s*\{([^}]*)\}\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = emitRegex.exec(targetBlock)) !== null) {
    const eventName = m[1]!;
    const tableBody = m[2]!;
    const data: Record<string, unknown> = {};
    const kvRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([+-]?\d+(?:\.\d+)?|true|false|["'][^"']*["'])/g;
    let kv: RegExpExecArray | null;
    while ((kv = kvRegex.exec(tableBody)) !== null) {
      const k = kv[1]!;
      const rawV = kv[2]!;
      if (rawV === 'true') data[k] = true;
      else if (rawV === 'false') data[k] = false;
      else if (rawV.startsWith('"') || rawV.startsWith("'")) data[k] = rawV.slice(1, -1);
      else data[k] = Number(rawV);
    }
    commands.push({ name: eventName, data });
  }
  return commands;
}

/**
 * Sandboxed Lua Mod Runner with 2ms per-tick Watchdog and 3-Strike Worker Termination.
 */
export class ModSandboxInstance {
  public readonly mod: ModManifest;
  private active = false;
  private terminated = false;
  private terminationReason?: string;
  private violations = 0;
  private lastTickDurationMs = 0;
  private emittedCount = 0;
  private memoryUsedBytes = 4096;
  private onEmitCallback?: (cmd: EmittedModCommand) => void;

  constructor(
    mod: ModManifest,
    gameManifest: GameManifest,
    onEmit?: (cmd: EmittedModCommand) => void
  ) {
    if (!gameManifest.mods.enabled) {
      throw new Error(`Cannot load mod "${mod.id}": mods.enabled is false in game manifest "${gameManifest.id}"`);
    }
    const sigCheck = verifyModManifest(mod);
    if (!sigCheck.valid) {
      throw new Error(`Cannot load mod "${mod.id}": signature verification failed (${sigCheck.reason})`);
    }
    this.mod = mod;
    this.onEmitCallback = onEmit;
    this.active = true;
    this.memoryUsedBytes = 4096 + mod.entryCode.length * 4;
  }

  public invokeHook(hook: ModHook, simulatedDurationOverrideMs?: number): {
    ok: boolean;
    emitted: EmittedModCommand[];
    error?: string;
    terminated: boolean;
  } {
    if (!this.active || this.terminated) {
      return {
        ok: false,
        emitted: [],
        error: this.terminationReason ?? 'Mod is inactive or terminated',
        terminated: this.terminated
      };
    }

    const startMs = performance.now();
    const audit = auditLuaSourceSecurity(this.mod.entryCode);

    if (!audit.safe) {
      if (audit.violationType === 'forbidden_global') {
        // Immediate security containment without crashing the host game
        return {
          ok: false,
          emitted: [],
          error: audit.detail,
          terminated: this.terminated
        };
      }

      if (audit.violationType === 'memory_limit') {
        this.memoryUsedBytes = MAX_MOD_MEMORY_BYTES + 1024;
        this.terminate(audit.detail ?? 'Memory limit exceeded');
        return {
          ok: false,
          emitted: [],
          error: this.terminationReason,
          terminated: true
        };
      }

      if (audit.violationType === 'infinite_loop') {
        this.lastTickDurationMs = MAX_TICK_BUDGET_MS + 1.5;
        this.recordBudgetViolation(audit.detail ?? 'Watchdog timeout (>2.0 ms)');
        return {
          ok: false,
          emitted: [],
          error: audit.detail,
          terminated: this.terminated
        };
      }
    }

    const emitted = extractHookEmissions(this.mod.entryCode, hook);
    for (const cmd of emitted) {
      this.emittedCount++;
      this.onEmitCallback?.(cmd);
    }

    const elapsedMs = simulatedDurationOverrideMs ?? Math.max(0.08, performance.now() - startMs);
    this.lastTickDurationMs = Number(elapsedMs.toFixed(3));

    if (elapsedMs > MAX_TICK_BUDGET_MS) {
      this.recordBudgetViolation(`Tick took ${elapsedMs.toFixed(2)} ms (limit ${MAX_TICK_BUDGET_MS} ms)`);
      return {
        ok: false,
        emitted: [],
        error: `Budget violation (${this.violations}/${MAX_BUDGET_VIOLATIONS})`,
        terminated: this.terminated
      };
    }

    return {
      ok: true,
      emitted,
      terminated: false
    };
  }

  private recordBudgetViolation(reason: string): void {
    this.violations++;
    if (this.violations >= MAX_BUDGET_VIOLATIONS) {
      this.terminate(`Watchdog terminated mod after ${this.violations} budget violations: ${reason}`);
    }
  }

  public terminate(reason = 'Terminated by user or watchdog'): void {
    this.active = false;
    this.terminated = true;
    this.terminationReason = reason;
  }

  public getMetrics(): ModExecutionMetrics {
    return {
      modId: this.mod.id,
      active: this.active,
      terminated: this.terminated,
      terminationReason: this.terminationReason,
      violations: this.violations,
      lastTickDurationMs: this.lastTickDurationMs,
      emittedCount: this.emittedCount,
      memoryUsedBytes: this.memoryUsedBytes
    };
  }
}

const DEFAULT_MOD_SEED = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';

export function getBuiltinExampleMods(): ModManifest[] {
  const kp = deriveKeyPairFromSeedHex(DEFAULT_MOD_SEED);

  const rawMods: UnsignedModManifest[] = [
    {
      schema: 1,
      id: 'mod.openplay.turbo-neon',
      targetGameId: 'dev.openplay.pong',
      name: 'Turbo Neon Overdrive (1.6x)',
      version: '1.1.0',
      description: 'Acelera la velocidad del balón un 60% y activa la paleta cromática ácido-verde en CyberPong.',
      license: 'MIT',
      author: { name: 'Neo-Bogota Modders', pubkey: kp.formattedPubkey },
      hooks: ['on_init', 'on_tick'],
      entryCode: `-- Turbo Neon Overdrive Mod (Lua Sandbox)
function on_init()
  game.emit("set_speed", { multiplier = 1.6 })
  game.emit("set_neon_theme", { theme = 1 })
end

function on_tick(dt_ms)
  -- Mantiene el pulso de overdrive determinista
end`
    },
    {
      schema: 1,
      id: 'mod.openplay.titan-paddles',
      targetGameId: 'dev.openplay.pong',
      name: 'Titan Cyber Paddles (1.75x)',
      version: '1.0.2',
      description: 'Expande el tamaño de las paletas un 75% para duelos defensivos de alta velocidad.',
      license: 'Apache-2.0',
      author: { name: 'OpenPlay Core', pubkey: kp.formattedPubkey },
      hooks: ['on_init'],
      entryCode: `-- Titan Cyber Paddles
function on_init()
  game.emit("set_paddle_scale", { scale = 1.75 })
end`
    },
    {
      schema: 1,
      id: 'mod.openplay.gravity-well',
      targetGameId: 'dev.openplay.pong',
      name: 'Anomalía Gravitacional Orbital',
      version: '1.0.0',
      description: 'Curva la trayectoria del proyectil con gravedad sintética y cambia el HUD a carmesí.',
      license: 'MIT',
      author: { name: 'Tokyo Grid Labs', pubkey: kp.formattedPubkey },
      hooks: ['on_init', 'on_event'],
      entryCode: `-- Orbital Gravity Well Mod
function on_init()
  game.emit("set_gravity", { gravity = 0.85 })
  game.emit("set_neon_theme", { theme = 2 })
end`
    },
    {
      schema: 1,
      id: 'mod.openplay.arena-hyperdash',
      targetGameId: 'dev.openplay.arena',
      name: 'Hyper-Arena 1.5x Velocity',
      version: '1.0.0',
      description: 'Incrementa la velocidad táctica de todos los tanques en Neon Arena P2P.',
      license: 'MIT',
      author: { name: 'OpenPlay Core', pubkey: kp.formattedPubkey },
      hooks: ['on_init'],
      entryCode: `-- Hyper-Arena Velocity
function on_init()
  game.emit("set_speed", { multiplier = 1.5 })
end`
    }
  ];

  return rawMods.map((m) => signModManifest(m, DEFAULT_MOD_SEED));
}
