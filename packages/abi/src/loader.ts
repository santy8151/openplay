/**
 * OpenPlay Wasm Host ABI v0 Validator & Module Loader
 * Verifies SHA-256 integrity against `manifest.files`, validates all required `host-abi/0` exports
 * and allowed `"host"` imports, and instantiates the Wasm module.
 */

import { sha256Hex, type GameManifest, verifyGameManifest } from '@openplay/manifest';
import {
  ALLOWED_HOST_IMPORTS,
  type AbiValidationResult,
  type GameWasmExports,
  type HostCallbacks,
  NetChannel,
  REQUIRED_GAME_EXPORTS
} from './types.js';
import { type BuiltinGameId, createCartridgeKernel } from './wasm-cartridges.js';

const textDecoder = new TextDecoder();

export function validateWasmAbi(wasmBytes: Uint8Array): AbiValidationResult {
  const errors: string[] = [];

  if (!WebAssembly.validate(wasmBytes as BufferSource)) {
    return {
      valid: false,
      errors: ['Invalid WebAssembly binary (failed WebAssembly.validate)'],
      exportsFound: [],
      importsFound: []
    };
  }

  const mod = new WebAssembly.Module(wasmBytes as BufferSource);
  const moduleExports = WebAssembly.Module.exports(mod);
  const moduleImports = WebAssembly.Module.imports(mod);

  const exportMap = new Map<string, string>();
  for (const exp of moduleExports) {
    exportMap.set(exp.name, exp.kind);
  }

  for (const req of REQUIRED_GAME_EXPORTS) {
    const kind = exportMap.get(req);
    if (!kind) {
      errors.push(`Missing required export "${req}" in host-abi/0 module`);
    } else if (req === 'memory' && kind !== 'memory') {
      errors.push('Export "memory" must be a WebAssembly.Memory');
    } else if (req !== 'memory' && kind !== 'function') {
      errors.push(`Export "${req}" must be a function`);
    }
  }

  const allowedImports = new Set<string>(ALLOWED_HOST_IMPORTS);
  for (const imp of moduleImports) {
    if (imp.module !== 'host') {
      errors.push(`Forbidden import module "${imp.module}" (only "host" is permitted in host-abi/0)`);
    } else if (!allowedImports.has(imp.name)) {
      errors.push(`Forbidden host import "host.${imp.name}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    exportsFound: moduleExports.map((e) => e.name),
    importsFound: moduleImports.map((i) => ({ module: i.module, name: i.name, kind: i.kind }))
  };
}

export interface LoadedGameRuntime {
  manifest: GameManifest;
  exports: GameWasmExports;
  wasmSha256: string;
  getFramebufferRGBA(width: number, height: number): Uint8ClampedArray;
  takeSnapshot(): Uint8Array;
  restoreSnapshot(snapshotBytes: Uint8Array): void;
  sendModEvent(eventName: string, data: Record<string, unknown>): void;
}

export async function instantiateGameModule(
  wasmBytes: Uint8Array,
  manifest: GameManifest,
  callbacks: HostCallbacks = {}
): Promise<LoadedGameRuntime> {
  // 1. Verify manifest schema & Ed25519 signature
  const manifestCheck = verifyGameManifest(manifest);
  if (!manifestCheck.valid) {
    throw new Error(`Manifest signature verification failed: ${manifestCheck.errors.join(', ')}`);
  }

  // 2. Verify SHA-256 of wasmBytes against manifest.files entry
  const entryFile = manifest.files.find((f) => f.path === manifest.entry);
  if (!entryFile) {
    throw new Error(`Entry file "${manifest.entry}" not listed in manifest.files`);
  }
  const actualSha256 = sha256Hex(wasmBytes);
  if (actualSha256 !== entryFile.sha256) {
    throw new Error(
      `Wasm SHA-256 mismatch for ${manifest.entry}: expected ${entryFile.sha256}, got ${actualSha256} (binary tampered)`
    );
  }

  // 3. Validate host-abi/0 exports and imports
  const abiCheck = validateWasmAbi(wasmBytes);
  if (!abiCheck.valid) {
    throw new Error(`ABI validation failed: ${abiCheck.errors.join(', ')}`);
  }

  let instanceExports: GameWasmExports | null = null;
  const storageMap = new Map<string, Uint8Array>();

  const getMemory = (): WebAssembly.Memory => {
    if (!instanceExports) {
      throw new Error('Wasm instance not yet initialized');
    }
    return instanceExports.memory;
  };

  const gameId = (
    ['dev.openplay.pong', 'dev.openplay.arena', 'dev.openplay.cyberrunner'].includes(manifest.id)
      ? manifest.id
      : 'dev.openplay.pong'
  ) as BuiltinGameId;

  const kernel = createCartridgeKernel(gameId, {
    getMemory,
    onAudioPlay: (id, vol) => callbacks.onAudioPlay?.(id, vol),
    onLog: (msg) => callbacks.onLog?.(msg),
    onNetSend: (peer, channel, data) => callbacks.onNetSend?.(peer, channel, data) ?? 0,
    onModEmit: (eventJson) => callbacks.onModEmit?.(eventJson)
  });

  const hostImports: WebAssembly.ModuleImports = {
    log: (ptr: number, len: number) => {
      const bytes = new Uint8Array(getMemory().buffer, ptr, len);
      callbacks.onLog?.(textDecoder.decode(bytes));
    },
    audio_play: (id: number, volQ8: number) => {
      if (manifest.permissions.includes('audio')) {
        callbacks.onAudioPlay?.(id >>> 0, volQ8 >>> 0);
      }
    },
    storage_get: (kptr: number, klen: number, vptr: number, vcap: number): number => {
      if (!manifest.permissions.includes('storage')) return -1;
      const mem = getMemory();
      const key = textDecoder.decode(new Uint8Array(mem.buffer, kptr, klen));
      const val = callbacks.onStorageGet ? callbacks.onStorageGet(key) : (storageMap.get(key) ?? null);
      if (!val) return 0;
      const copyLen = Math.min(val.length, vcap);
      new Uint8Array(mem.buffer, vptr, copyLen).set(val.subarray(0, copyLen));
      return copyLen;
    },
    storage_set: (kptr: number, klen: number, vptr: number, vlen: number): number => {
      if (!manifest.permissions.includes('storage')) return -1;
      const mem = getMemory();
      const key = textDecoder.decode(new Uint8Array(mem.buffer, kptr, klen));
      const val = new Uint8Array(mem.buffer, vptr, vlen).slice();
      storageMap.set(key, val);
      callbacks.onStorageSet?.(key, val);
      return 1;
    },
    net_send: (peer: number, channel: number, ptr: number, len: number): number => {
      if (!manifest.permissions.includes('net.p2p')) return -1;
      const payload = new Uint8Array(getMemory().buffer, ptr, len).slice();
      const ch = channel === 1 ? NetChannel.UnreliableUnordered : NetChannel.ReliableOrdered;
      return callbacks.onNetSend ? callbacks.onNetSend(peer >>> 0, ch, payload) : 0;
    },
    mod_emit: (ptr: number, len: number) => {
      const eventStr = textDecoder.decode(new Uint8Array(getMemory().buffer, ptr, len));
      callbacks.onModEmit?.(eventStr);
    },
    kernel_init: (seed: number, w: number, h: number) => kernel.init(seed, w, h),
    kernel_tick: (dtUs: number) => kernel.tick(dtUs),
    kernel_input: (kind: number, a: number, b: number, c: number) => kernel.input(kind, a, b, c),
    kernel_net_recv: (peer: number, ptr: number, len: number) => kernel.netRecv(peer, ptr, len),
    kernel_snapshot: (ptr: number, cap: number) => kernel.snapshot(ptr, cap),
    kernel_restore: (ptr: number, len: number) => kernel.restore(ptr, len),
    kernel_mod_event: (ptr: number, len: number) => kernel.modEvent(ptr, len)
  };

  const { instance } = await WebAssembly.instantiate(wasmBytes as BufferSource, { host: hostImports });
  instanceExports = instance.exports as unknown as GameWasmExports;

  const scratchSnapshotPtr = instanceExports.game_alloc(256);
  const scratchModPtr = instanceExports.game_alloc(512);
  const textEncoder = new TextEncoder();

  return {
    manifest,
    exports: instanceExports,
    wasmSha256: actualSha256,

    getFramebufferRGBA(width: number, height: number): Uint8ClampedArray {
      const fbPtr = instanceExports!.game_framebuffer();
      return new Uint8ClampedArray(instanceExports!.memory.buffer, fbPtr, width * height * 4);
    },

    takeSnapshot(): Uint8Array {
      const written = instanceExports!.game_snapshot(scratchSnapshotPtr, 256);
      return new Uint8Array(instanceExports!.memory.buffer, scratchSnapshotPtr, written).slice();
    },

    restoreSnapshot(snapshotBytes: Uint8Array): void {
      const target = new Uint8Array(instanceExports!.memory.buffer, scratchSnapshotPtr, snapshotBytes.length);
      target.set(snapshotBytes);
      instanceExports!.game_restore(scratchSnapshotPtr, snapshotBytes.length);
    },

    sendModEvent(eventName: string, data: Record<string, unknown>): void {
      if (!instanceExports!.game_mod_event) return;
      const bytes = textEncoder.encode(JSON.stringify({ name: eventName, data }));
      const len = Math.min(bytes.length, 512);
      new Uint8Array(instanceExports!.memory.buffer, scratchModPtr, len).set(bytes.subarray(0, len));
      instanceExports!.game_mod_event(scratchModPtr, len);
    }
  };
}
