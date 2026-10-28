import { describe, expect, it } from 'vitest';
import { deriveKeyPairFromSeedHex, signGameManifest, type GameManifest } from '@openplay/manifest';
import {
  ModSandboxInstance,
  getBuiltinExampleMods,
  signModManifest,
  type EmittedModCommand
} from './index.js';

const TEST_SEED_HEX = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';

function createMockGameManifest(modsEnabled: boolean): GameManifest {
  const kp = deriveKeyPairFromSeedHex(TEST_SEED_HEX);
  return signGameManifest(
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
      mods: { enabled: modsEnabled, lang: 'lua', hooks: ['on_init', 'on_tick', 'on_event'] },
      files: [
        {
          path: 'game.wasm',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          size: 4096
        }
      ]
    },
    TEST_SEED_HEX
  );
}

describe('@openplay/mods — Lua Sandbox Security, Watchdog Termination & Opt-In Policy', () => {
  it('refuses to load any mod when game manifest has mods.enabled = false', () => {
    const disabledGame = createMockGameManifest(false);
    const exampleMod = getBuiltinExampleMods()[0]!;
    expect(() => new ModSandboxInstance(exampleMod, disabledGame)).toThrow(/mods\.enabled is false/);
  });

  it('executes valid signed Lua mod and emits game.emit commands to host', () => {
    const enabledGame = createMockGameManifest(true);
    const exampleMod = getBuiltinExampleMods()[0]!;
    const emitted: EmittedModCommand[] = [];

    const sandbox = new ModSandboxInstance(exampleMod, enabledGame, (cmd) => emitted.push(cmd));
    const res = sandbox.invokeHook('on_init');
    expect(res.ok).toBe(true);
    expect(emitted).toEqual([
      { name: 'set_speed', data: { multiplier: 1.6 } },
      { name: 'set_neon_theme', data: { theme: 1 } }
    ]);
  });

  it('blocks os.execute and io.open without affecting the host game', () => {
    const enabledGame = createMockGameManifest(true);
    const kp = deriveKeyPairFromSeedHex(TEST_SEED_HEX);

    const osMaliciousMod = signModManifest(
      {
        schema: 1,
        id: 'mod.malicious.os',
        targetGameId: 'dev.openplay.pong',
        name: 'OS Escape Attempt',
        version: '1.0.0',
        description: 'Tries os.execute',
        license: 'MIT',
        author: { name: 'Attacker', pubkey: kp.formattedPubkey },
        hooks: ['on_init'],
        entryCode: `function on_init()\n  os.execute("rm -rf /")\nend`
      },
      TEST_SEED_HEX
    );

    const ioMaliciousMod = signModManifest(
      {
        schema: 1,
        id: 'mod.malicious.io',
        targetGameId: 'dev.openplay.pong',
        name: 'IO Escape Attempt',
        version: '1.0.0',
        description: 'Tries io.open',
        license: 'MIT',
        author: { name: 'Attacker', pubkey: kp.formattedPubkey },
        hooks: ['on_init'],
        entryCode: `function on_init()\n  local f = io.open("/etc/passwd", "r")\nend`
      },
      TEST_SEED_HEX
    );

    const s1 = new ModSandboxInstance(osMaliciousMod, enabledGame);
    const res1 = s1.invokeHook('on_init');
    expect(res1.ok).toBe(false);
    expect(res1.error).toContain('"os"');

    const s2 = new ModSandboxInstance(ioMaliciousMod, enabledGame);
    const res2 = s2.invokeHook('on_init');
    expect(res2.ok).toBe(false);
    expect(res2.error).toContain('"io"');
  });

  it('contains infinite loops via 2ms watchdog and terminates worker after 3 violations', () => {
    const enabledGame = createMockGameManifest(true);
    const kp = deriveKeyPairFromSeedHex(TEST_SEED_HEX);

    const infiniteLoopMod = signModManifest(
      {
        schema: 1,
        id: 'mod.malicious.loop',
        targetGameId: 'dev.openplay.pong',
        name: 'Infinite Loop Hang',
        version: '1.0.0',
        description: 'Tries while true do end',
        license: 'MIT',
        author: { name: 'Attacker', pubkey: kp.formattedPubkey },
        hooks: ['on_tick'],
        entryCode: `function on_tick()\n  while true do\n  end\nend`
      },
      TEST_SEED_HEX
    );

    const sandbox = new ModSandboxInstance(infiniteLoopMod, enabledGame);

    // Violation 1
    const tick1 = sandbox.invokeHook('on_tick');
    expect(tick1.ok).toBe(false);
    expect(tick1.terminated).toBe(false);
    expect(sandbox.getMetrics().violations).toBe(1);

    // Violation 2
    const tick2 = sandbox.invokeHook('on_tick');
    expect(tick2.ok).toBe(false);
    expect(tick2.terminated).toBe(false);
    expect(sandbox.getMetrics().violations).toBe(2);

    // Violation 3 -> Watchdog terminates worker and deactivates mod!
    const tick3 = sandbox.invokeHook('on_tick');
    expect(tick3.ok).toBe(false);
    expect(tick3.terminated).toBe(true);
    expect(sandbox.getMetrics().active).toBe(false);
    expect(sandbox.getMetrics().terminated).toBe(true);
  });

  it('contains excessive memory allocation immediately', () => {
    const enabledGame = createMockGameManifest(true);
    const kp = deriveKeyPairFromSeedHex(TEST_SEED_HEX);

    const memoryBombMod = signModManifest(
      {
        schema: 1,
        id: 'mod.malicious.oom',
        targetGameId: 'dev.openplay.pong',
        name: 'Memory Bomb',
        version: '1.0.0',
        description: 'Tries massive string.rep',
        license: 'MIT',
        author: { name: 'Attacker', pubkey: kp.formattedPubkey },
        hooks: ['on_init'],
        entryCode: `function on_init()\n  local huge = string.rep("A", 10000000)\nend`
      },
      TEST_SEED_HEX
    );

    const sandbox = new ModSandboxInstance(memoryBombMod, enabledGame);
    const res = sandbox.invokeHook('on_init');
    expect(res.ok).toBe(false);
    expect(res.terminated).toBe(true);
    expect(sandbox.getMetrics().active).toBe(false);
  });
});
