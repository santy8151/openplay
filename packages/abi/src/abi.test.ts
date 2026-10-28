import { describe, expect, it } from 'vitest';
import { deriveKeyPairFromSeedHex, sha256Hex, signGameManifest } from '@openplay/manifest';
import {
  buildCartridgeWasmBytes,
  InputKind,
  instantiateGameModule,
  KeyCode,
  validateWasmAbi
} from './index.js';

const TEST_SEED_HEX = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';

describe('@openplay/abi — Host ABI v0 Wasm Validator & Deterministic Loader', () => {
  it('validates synthesized host-abi/0 Wasm cartridges natively via WebAssembly.Module', () => {
    const wasmBytes = buildCartridgeWasmBytes('dev.openplay.pong');
    const result = validateWasmAbi(wasmBytes);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.exportsFound).toContain('memory');
    expect(result.exportsFound).toContain('game_init');
    expect(result.exportsFound).toContain('game_tick');
    expect(result.exportsFound).toContain('game_framebuffer');
    expect(result.exportsFound).toContain('game_snapshot');
    expect(result.exportsFound).toContain('game_restore');
  });

  it('instantiates Pong cartridge, advances 600 deterministic ticks, and rejects tampered Wasm bytes', async () => {
    const wasmBytes = buildCartridgeWasmBytes('dev.openplay.pong');
    const wasmSha256 = sha256Hex(wasmBytes);
    const kp = deriveKeyPairFromSeedHex(TEST_SEED_HEX);

    const signedManifest = signGameManifest(
      {
        schema: 1,
        id: 'dev.openplay.pong',
        name: 'CyberPong 2099',
        version: '1.0.0',
        license: 'MIT',
        author: { name: 'OpenPlay Core', pubkey: kp.formattedPubkey },
        abi: 'host-abi/0',
        entry: 'game.wasm',
        display: { width: 480, height: 320, scale: 'fit' },
        permissions: ['audio', 'storage', 'net.p2p'],
        multiplayer: { mode: 'p2p-lockstep', min: 1, max: 2, tickrate: 60 },
        mods: { enabled: true, lang: 'lua', hooks: ['on_init', 'on_tick', 'on_event'] },
        files: [{ path: 'game.wasm', sha256: wasmSha256, size: wasmBytes.length }]
      },
      TEST_SEED_HEX
    );

    const runtime = await instantiateGameModule(wasmBytes, signedManifest);
    runtime.exports.game_init(424242, 480, 320);

    // Advance 300 ticks, take snapshot, advance 300 more ticks (total 600 ticks)
    for (let i = 0; i < 300; i++) {
      if (i === 20) runtime.exports.game_input(InputKind.KeyDown, KeyCode.Up, 0, 0);
      if (i === 80) runtime.exports.game_input(InputKind.KeyUp, KeyCode.Up, 0, 0);
      runtime.exports.game_tick(16666);
    }

    const snapAt300 = runtime.takeSnapshot();
    expect(snapAt300.length).toBeGreaterThan(0);

    for (let i = 0; i < 300; i++) {
      runtime.exports.game_tick(16666);
    }
    const snapAt600A = sha256Hex(runtime.takeSnapshot());

    // Restore snapshot at 300 and replay the exact same 300 ticks -> must produce identical hash!
    runtime.restoreSnapshot(snapAt300);
    for (let i = 0; i < 300; i++) {
      runtime.exports.game_tick(16666);
    }
    const snapAt600B = sha256Hex(runtime.takeSnapshot());
    expect(snapAt600B).toBe(snapAt600A);

    // Framebuffer contains valid RGBA8 pixels
    const fb = runtime.getFramebufferRGBA(480, 320);
    expect(fb.length).toBe(480 * 320 * 4);
    expect(fb[3]).toBe(255); // Alpha channel = 255

    // Tamper 1 byte in Wasm binary -> must reject with SHA-256 mismatch!
    const tamperedWasm = wasmBytes.slice();
    tamperedWasm[tamperedWasm.length - 1] ^= 0xff;
    await expect(instantiateGameModule(tamperedWasm, signedManifest)).rejects.toThrow(/SHA-256 mismatch/);
  });
});
